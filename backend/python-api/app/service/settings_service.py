from __future__ import annotations

from app.domain.app_settings import AppSettings
from app.repository.settings_repo import SettingsRepository


class SettingsService:
    def __init__(self, settings_repo: SettingsRepository):
        self._settings = settings_repo

    async def get_all(self) -> list[AppSettings]:
        return await self._settings.get_all()

    async def get(self, key: str) -> str:
        return await self._settings.get(key)

    async def set(self, key: str, value: str, session) -> None:
        await self._settings.set(key, value)
        await session.commit()
