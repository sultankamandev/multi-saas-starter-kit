from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.login_event import LoginEvent


class LoginEventRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, event: LoginEvent) -> None:
        self._session.add(event)
        await self._session.flush()
