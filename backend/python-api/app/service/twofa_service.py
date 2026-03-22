from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone

import pyotp
from passlib.hash import bcrypt

from app.domain.errors import ERR_INVALID_INPUT, ERR_NOT_FOUND, ERR_UNAUTHORIZED, DomainError
from app.domain.login_event import LoginEvent
from app.domain.twofa import RecoveryCode, TwoFactorToken
from app.dto.auth import TokenPair
from app.platform.email import EmailSender
from app.repository.login_event_repo import LoginEventRepository
from app.repository.twofa_repo import TwoFARepository
from app.repository.user_repo import UserRepository
from app.service.token_service import TokenService

logger = logging.getLogger(__name__)

MAX_2FA_ATTEMPTS = 5
TWO_FA_EXPIRY_MINUTES = 5
RECOVERY_CODE_COUNT = 10


class TwoFAService:
    def __init__(
        self,
        users: UserRepository,
        twofa_repo: TwoFARepository,
        login_events: LoginEventRepository,
        token_svc: TokenService,
        email_sender: EmailSender,
    ):
        self._users = users
        self._twofa = twofa_repo
        self._login_events = login_events
        self._token_svc = token_svc
        self._email = email_sender

    async def send_2fa_code(self, user_id: int, remember_me: bool, session) -> None:
        user = await self._users.find_by_id(user_id)
        await self._twofa.invalidate_tokens(user.id)

        code = f"{secrets.randbelow(900000) + 100000}"
        token = TwoFactorToken(
            user_id=user.id,
            code=code,
            remember_me=remember_me,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=TWO_FA_EXPIRY_MINUTES),
        )
        await self._twofa.create_token(token)
        await session.commit()

        asyncio.create_task(
            self._email.send_2fa_code(user.email, code, user.language or "en", user.full_name)
        )

    async def verify_2fa(
        self, public_id: str, code: str, client_ip: str, user_agent: str, session
    ) -> tuple[User, TokenPair]:
        user = await self._users.find_by_public_id(public_id)
        token = await self._twofa.find_latest_unused_token(user.id)

        if token is None:
            raise DomainError(ERR_INVALID_INPUT, "No active 2FA code found")

        if token.attempts >= MAX_2FA_ATTEMPTS:
            await self._twofa.invalidate_tokens(user.id)
            await session.commit()
            raise DomainError(ERR_UNAUTHORIZED, "Too many failed attempts")

        if datetime.now(timezone.utc) > token.expires_at.replace(tzinfo=timezone.utc):
            raise DomainError(ERR_UNAUTHORIZED, "Verification code has expired")

        if token.code != code:
            await self._twofa.increment_attempts(token.id)
            await session.commit()
            raise DomainError(ERR_UNAUTHORIZED, "Invalid verification code")

        await self._twofa.mark_token_used(token.id)
        pair = await self._token_svc.issue_token_pair(user.id, user.role, token.remember_me)
        event = LoginEvent(user_id=user.id, ip=client_ip, user_agent=user_agent)
        await self._login_events.create(event)
        await session.commit()

        return user, pair

    async def resend_2fa(self, public_id: str, session) -> None:
        try:
            user = await self._users.find_by_public_id(public_id)
        except DomainError:
            return

        if user.two_fa_secret:
            raise DomainError(ERR_INVALID_INPUT, "TOTP is enabled. Use your authenticator app.")

        await self._twofa.invalidate_tokens(user.id)
        code = f"{secrets.randbelow(900000) + 100000}"
        token = TwoFactorToken(
            user_id=user.id,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=TWO_FA_EXPIRY_MINUTES),
        )
        await self._twofa.create_token(token)
        await session.commit()

        asyncio.create_task(
            self._email.send_2fa_code(user.email, code, user.language or "en", user.full_name)
        )

    async def setup_2fa(self, user_id: int, session) -> dict:
        user = await self._users.find_by_id(user_id)
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="SaaS Starter")

        user.two_fa_secret = secret
        await self._users.update(user)
        await session.commit()

        return {"otpauth_url": uri, "secret": secret, "message": "Scan the QR code with your authenticator app"}

    async def verify_2fa_setup(self, user_id: int, code: str, session) -> dict:
        user = await self._users.find_by_id(user_id)

        if not user.two_fa_secret:
            raise DomainError(ERR_INVALID_INPUT, "2FA has not been set up")

        totp = pyotp.TOTP(user.two_fa_secret)
        if not totp.verify(code):
            raise DomainError(ERR_UNAUTHORIZED, "Invalid TOTP code")

        user.two_fa_enabled = True
        await self._users.update(user)

        recovery_codes: list[str] = []
        for _ in range(RECOVERY_CODE_COUNT):
            raw = secrets.token_hex(4)
            recovery_codes.append(raw)
            rc = RecoveryCode(
                user_id=user.id,
                code_hash=bcrypt.using(rounds=12).hash(raw),
            )
            await self._twofa.create_recovery_code(rc)

        await session.commit()

        return {
            "message": "Two-factor authentication enabled successfully",
            "recovery_codes": recovery_codes,
            "warning": "Save these recovery codes in a safe place. Each code can only be used once.",
        }

    async def verify_totp_login(
        self, public_id: str, code: str, remember_me: bool, client_ip: str, user_agent: str, session
    ) -> tuple[User, TokenPair]:
        user = await self._users.find_by_public_id(public_id)

        if not user.two_fa_secret:
            raise DomainError(ERR_INVALID_INPUT, "TOTP is not set up")

        totp = pyotp.TOTP(user.two_fa_secret)
        if not totp.verify(code):
            raise DomainError(ERR_UNAUTHORIZED, "Invalid TOTP code")

        pair = await self._token_svc.issue_token_pair(user.id, user.role, remember_me)
        event = LoginEvent(user_id=user.id, ip=client_ip, user_agent=user_agent)
        await self._login_events.create(event)
        await session.commit()

        return user, pair

    async def use_recovery_code(
        self, public_id: str, code: str, remember_me: bool, client_ip: str, user_agent: str, session
    ) -> tuple[User, TokenPair]:
        user = await self._users.find_by_public_id(public_id)
        unused_codes = await self._twofa.find_unused_recovery_codes(user.id)

        matched: RecoveryCode | None = None
        for rc in unused_codes:
            if bcrypt.verify(code, rc.code_hash):
                matched = rc
                break

        if matched is None:
            raise DomainError(ERR_UNAUTHORIZED, "Invalid or already used recovery code")

        await self._twofa.mark_recovery_code_used(matched.id)
        pair = await self._token_svc.issue_token_pair(user.id, user.role, remember_me)
        event = LoginEvent(user_id=user.id, ip=client_ip, user_agent=user_agent)
        await self._login_events.create(event)
        await session.commit()

        return user, pair
