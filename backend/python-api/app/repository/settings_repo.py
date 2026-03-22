from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.app_settings import AppSettings


class SettingsRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get(self, key: str) -> str:
        stmt = select(AppSettings).where(AppSettings.key == key)
        result = await self._session.execute(stmt)
        setting = result.scalar_one_or_none()
        return setting.value if setting and setting.value else ""

    async def set(self, key: str, value: str) -> None:
        stmt = select(AppSettings).where(AppSettings.key == key)
        result = await self._session.execute(stmt)
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = value
        else:
            self._session.add(AppSettings(key=key, value=value))
        await self._session.flush()

    async def get_all(self) -> list[AppSettings]:
        stmt = select(AppSettings).order_by(AppSettings.key)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
