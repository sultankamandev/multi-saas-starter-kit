from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from passlib.hash import bcrypt

from app.domain.errors import (
    ERR_CONFLICT,
    ERR_INVALID_INPUT,
    ERR_UNAUTHORIZED,
    DomainError,
    TwoFARequiredError,
)
from app.domain.password import validate_password_complexity
from app.domain.token import EmailVerificationToken, generate_secure_token, token_expiry
from app.domain.username import normalize_username, validate_username
from app.domain.user import User
from app.dto.auth import LoginRequest, RegisterRequest, TokenPair
from app.i18n.loader import is_language_supported
from app.platform.captcha import CaptchaVerifier
from app.platform.email import EmailSender
from app.platform.geoip import GeoIPResolver
from app.repository.login_event_repo import LoginEventRepository
from app.repository.settings_repo import SettingsRepository
from app.repository.token_repo import TokenRepository
from app.repository.user_repo import UserRepository
from app.service.token_service import TokenService
from app.domain.login_event import LoginEvent

logger = logging.getLogger(__name__)


@dataclass
class RegisterResult:
    user: User
    verification_required: bool


@dataclass
class LoginResult:
    user: User
    token_pair: TokenPair


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        tokens: TokenRepository,
        login_events: LoginEventRepository,
        settings: SettingsRepository,
        token_svc: TokenService,
        email_sender: EmailSender,
        captcha: CaptchaVerifier,
        geoip: GeoIPResolver,
        frontend_url: str,
    ):
        self._users = users
        self._tokens = tokens
        self._login_events = login_events
        self._settings = settings
        self._token_svc = token_svc
        self._email = email_sender
        self._captcha = captcha
        self._geoip = geoip
        self._frontend_url = frontend_url

    async def register(self, req: RegisterRequest, client_ip: str, session) -> RegisterResult:
        if req.recaptcha_token:
            ok = await self._captcha.verify(req.recaptcha_token)
            if not ok:
                raise DomainError(ERR_INVALID_INPUT, "reCAPTCHA verification failed")

        username = normalize_username(req.username) if req.username else ""
        if username:
            err = validate_username(username)
            if err:
                raise DomainError(ERR_INVALID_INPUT, err)
            available = await self._users.is_username_available(username)
            if not available:
                raise DomainError(ERR_CONFLICT, "Username already taken")

        existing = await self._users.find_by_email_unscoped(req.email)
        if existing and not existing.is_deleted:
            raise DomainError(ERR_CONFLICT, "User already exists")

        err = validate_password_complexity(req.password)
        if err:
            raise DomainError(ERR_INVALID_INPUT, err)

        lang = self._normalize_lang(req.language)
        country = await self._resolve_country(req.country, client_ip, lang)
        password_hash = bcrypt.using(rounds=12).hash(req.password)

        require_verification = await self._is_verification_required()

        user = User(
            username=username or None,
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            password_hash=password_hash,
            role="user",
            language=lang,
            country=country,
            verified=not require_verification,
        )

        if existing and existing.is_deleted:
            await self._users.hard_delete_related_records(existing.id)
            await self._users.hard_delete(existing.id)

        await self._users.create(user)

        verification_token_str = ""
        if require_verification:
            verification_token_str = generate_secure_token()
            v_token = EmailVerificationToken(
                user_id=user.id,
                token=verification_token_str,
                expires_at=token_expiry(15),
            )
            await self._tokens.create_email_verification_token(v_token)

        await session.commit()

        if require_verification and verification_token_str:
            link = f"{self._frontend_url}/verify-email?token={verification_token_str}"
            asyncio.create_task(self._email.send_verification(user.email, link, lang, user.full_name))

        return RegisterResult(user=user, verification_required=require_verification)

    async def login(self, req: LoginRequest, client_ip: str, user_agent: str, session) -> LoginResult:
        if req.recaptcha_token:
            ok = await self._captcha.verify(req.recaptcha_token)
            if not ok:
                raise DomainError(ERR_INVALID_INPUT, "reCAPTCHA verification failed")

        try:
            user = await self._users.find_by_email_or_username(req.email_or_username)
        except DomainError:
            raise DomainError(ERR_UNAUTHORIZED, "Invalid credentials")

        if not bcrypt.verify(req.password, user.password_hash):
            raise DomainError(ERR_UNAUTHORIZED, "Invalid credentials")

        if not user.verified:
            raise DomainError(ERR_UNAUTHORIZED, "Please verify your email address before logging in")

        if user.two_fa_enabled:
            if user.two_fa_secret:
                raise TwoFARequiredError("totp", user.public_id, "TOTP code required")
            else:
                from app.service.twofa_service import TwoFAService
                raise TwoFARequiredError("email", user.public_id, "2FA code sent to email")

        pair = await self._token_svc.issue_token_pair(user.id, user.role, req.remember_me)

        event = LoginEvent(user_id=user.id, ip=client_ip, user_agent=user_agent)
        await self._login_events.create(event)
        await session.commit()

        return LoginResult(user=user, token_pair=pair)

    async def get_me(self, user_id: int) -> User:
        return await self._users.find_by_id(user_id)

    async def refresh_token(self, raw_refresh_token: str, session) -> TokenPair:
        user_id, family_id = await self._token_svc.validate_and_revoke_refresh_token(raw_refresh_token)
        user = await self._users.find_by_id(user_id)
        pair = await self._token_svc.issue_rotated_pair(user.id, user.role, family_id)
        await session.commit()
        return pair

    async def logout(self, raw_refresh_token: str, session) -> None:
        await self._token_svc.revoke_refresh_token(raw_refresh_token)
        await session.commit()

    async def logout_all(self, user_id: int, session) -> None:
        await self._token_svc.revoke_all_user_tokens(user_id)
        await session.commit()

    async def _is_verification_required(self) -> bool:
        val = await self._settings.get("email_verification_required")
        return val.lower() == "true" if val else False

    def _normalize_lang(self, lang: str) -> str:
        if lang and is_language_supported(lang.lower()):
            return lang.lower()
        return "en"

    async def _resolve_country(self, country: str, client_ip: str, lang: str) -> str:
        if country:
            return country.upper()[:10]
        resolved = await self._geoip.resolve_country(client_ip)
        return resolved or ""
