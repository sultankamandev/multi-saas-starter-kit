from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.twofa import RecoveryCode, TwoFactorToken


class TwoFARepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_token(self, token: TwoFactorToken) -> None:
        self._session.add(token)
        await self._session.flush()

    async def find_valid_token(self, user_id: int, code: str) -> TwoFactorToken | None:
        stmt = select(TwoFactorToken).where(
            TwoFactorToken.user_id == user_id,
            TwoFactorToken.code == code,
            TwoFactorToken.used.is_(False),
            TwoFactorToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_latest_unused_token(self, user_id: int) -> TwoFactorToken | None:
        stmt = (
            select(TwoFactorToken)
            .where(
                TwoFactorToken.user_id == user_id,
                TwoFactorToken.used.is_(False),
            )
            .order_by(TwoFactorToken.created_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def increment_attempts(self, token_id: int) -> None:
        await self._session.execute(
            update(TwoFactorToken)
            .where(TwoFactorToken.id == token_id)
            .values(attempts=TwoFactorToken.attempts + 1)
        )
        await self._session.flush()

    async def invalidate_tokens(self, user_id: int) -> None:
        await self._session.execute(
            update(TwoFactorToken)
            .where(TwoFactorToken.user_id == user_id, TwoFactorToken.used.is_(False))
            .values(used=True)
        )
        await self._session.flush()

    async def mark_token_used(self, token_id: int) -> None:
        await self._session.execute(
            update(TwoFactorToken).where(TwoFactorToken.id == token_id).values(used=True)
        )
        await self._session.flush()

    # --- Recovery codes ---

    async def create_recovery_code(self, code: RecoveryCode) -> None:
        self._session.add(code)
        await self._session.flush()

    async def find_unused_recovery_codes(self, user_id: int) -> list[RecoveryCode]:
        stmt = select(RecoveryCode).where(
            RecoveryCode.user_id == user_id,
            RecoveryCode.used.is_(False),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_recovery_code_used(self, code_id: int) -> None:
        await self._session.execute(
            update(RecoveryCode)
            .where(RecoveryCode.id == code_id)
            .values(used=True, used_at=datetime.now(timezone.utc))
        )
        await self._session.flush()
