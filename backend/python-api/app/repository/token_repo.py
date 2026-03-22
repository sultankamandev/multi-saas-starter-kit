from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.token import (
    EmailVerificationToken,
    PasswordResetToken,
    RefreshToken,
)


class TokenRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    # --- Refresh tokens ---

    async def create_refresh_token(self, token: RefreshToken) -> None:
        self._session.add(token)
        await self._session.flush()

    async def find_refresh_token_by_hash(self, token_hash: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_refresh_token_by_hash(self, token_hash: str) -> None:
        await self._session.execute(
            update(RefreshToken).where(RefreshToken.token_hash == token_hash).values(revoked=True)
        )
        await self._session.flush()

    async def revoke_token_family(self, family_id: str) -> None:
        await self._session.execute(
            update(RefreshToken).where(RefreshToken.family_id == family_id).values(revoked=True)
        )
        await self._session.flush()

    async def revoke_all_user_refresh_tokens(self, user_id: int) -> None:
        await self._session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
            .values(revoked=True)
        )
        await self._session.flush()

    # --- Password reset tokens ---

    async def create_password_reset_token(self, token: PasswordResetToken) -> None:
        self._session.add(token)
        await self._session.flush()

    async def find_password_reset_token(self, token_str: str) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token == token_str,
            PasswordResetToken.used.is_(False),
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def invalidate_password_reset_tokens(self, user_id: int) -> None:
        await self._session.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user_id, PasswordResetToken.used.is_(False))
            .values(used=True)
        )
        await self._session.flush()

    async def mark_password_reset_token_used(self, token_id: int) -> None:
        await self._session.execute(
            update(PasswordResetToken).where(PasswordResetToken.id == token_id).values(used=True)
        )
        await self._session.flush()

    # --- Email verification tokens ---

    async def create_email_verification_token(self, token: EmailVerificationToken) -> None:
        self._session.add(token)
        await self._session.flush()

    async def find_email_verification_token(self, token_str: str) -> EmailVerificationToken | None:
        stmt = select(EmailVerificationToken).where(
            EmailVerificationToken.token == token_str,
            EmailVerificationToken.used.is_(False),
            EmailVerificationToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_email_verification_token_used(self, token_id: int) -> None:
        await self._session.execute(
            update(EmailVerificationToken).where(EmailVerificationToken.id == token_id).values(used=True)
        )
        await self._session.flush()
