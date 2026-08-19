from __future__ import annotations

import asyncio
import logging

from app.platform.password import hash_password, verify_password

from app.domain.errors import ERR_INVALID_INPUT, ERR_TOKEN_INVALID, ERR_UNAUTHORIZED, DomainError
from app.domain.password import validate_password_complexity
from app.domain.token import PasswordResetToken, generate_secure_token, token_expiry
from app.platform.email import EmailSender
from app.repository.token_repo import TokenRepository
from app.repository.user_repo import UserRepository
from app.service.token_service import TokenService

logger = logging.getLogger(__name__)


class PasswordService:
    def __init__(
        self,
        users: UserRepository,
        tokens: TokenRepository,
        token_svc: TokenService,
        email_sender: EmailSender,
        frontend_url: str,
    ):
        self._users = users
        self._tokens = tokens
        self._token_svc = token_svc
        self._email = email_sender
        self._frontend_url = frontend_url

    async def forgot_password(self, email: str, lang: str, session) -> None:
        try:
            user = await self._users.find_by_email(email)
        except DomainError:
            return

        await self._tokens.invalidate_password_reset_tokens(user.id)

        token_str = generate_secure_token()
        prt = PasswordResetToken(
            user_id=user.id,
            token=token_str,
            expires_at=token_expiry(15),
        )
        await self._tokens.create_password_reset_token(prt)
        await session.commit()

        link = f"{self._frontend_url}/reset-password?token={token_str}"
        asyncio.create_task(self._email.send_password_reset(user.email, link, lang))

    async def reset_password(self, token_str: str, new_password: str, session) -> None:
        prt = await self._tokens.find_password_reset_token(token_str)
        if prt is None:
            raise DomainError(ERR_TOKEN_INVALID, "Invalid or expired reset token")

        err = validate_password_complexity(new_password)
        if err:
            raise DomainError(ERR_INVALID_INPUT, err)

        user = await self._users.find_by_id(prt.user_id)
        user.password_hash = hash_password(new_password)
        await self._users.update(user)
        await self._tokens.mark_password_reset_token_used(prt.id)
        await self._token_svc.revoke_all_user_tokens(user.id)
        await session.commit()

    async def change_password(
        self, user_id: int, current_password: str, new_password: str, session
    ) -> None:
        """Rotate the password of a signed-in user.

        Unlike reset_password there is no emailed token, so the current password
        is what proves intent -- an access token alone is not enough.

        Every refresh token is revoked on success, exactly as reset_password
        does, so a change signs the account out everywhere including the caller.
        """
        user = await self._users.find_by_id(user_id)

        if not verify_password(current_password, user.password_hash):
            raise DomainError(ERR_UNAUTHORIZED, "Current password is incorrect")

        err = validate_password_complexity(new_password)
        if err:
            raise DomainError(ERR_INVALID_INPUT, err)

        user.password_hash = hash_password(new_password)
        await self._users.update(user)
        await self._token_svc.revoke_all_user_tokens(user.id)
        await session.commit()

    async def verify_email(self, token_str: str, session) -> None:
        evt = await self._tokens.find_email_verification_token(token_str)
        if evt is None:
            raise DomainError(ERR_TOKEN_INVALID, "Invalid or expired verification token")

        user = await self._users.find_by_id(evt.user_id)
        user.verified = True
        await self._users.update(user)
        await self._tokens.mark_email_verification_token_used(evt.id)
        await session.commit()
