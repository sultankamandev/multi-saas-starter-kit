from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.repository.analytics_repo import AnalyticsRepository


class AnalyticsService:
    def __init__(self, analytics_repo: AnalyticsRepository):
        self._analytics = analytics_repo

    async def user_registrations(
        self,
        start: datetime | None = None,
        end: datetime | None = None,
        country: str | None = None,
        language: str | None = None,
    ) -> list[dict]:
        if end is None:
            end = datetime.now(timezone.utc)
        if start is None:
            start = end - timedelta(days=30)
        return await self._analytics.user_registrations_by_day(start, end, country, language)

    async def active_users(self, start: datetime | None = None, end: datetime | None = None) -> dict:
        now = datetime.now(timezone.utc)
        if end is None:
            end = now
        if start is None:
            start = end - timedelta(days=30)

        daily = await self._analytics.active_users_by_day(start, end)
        active_24h = await self._analytics.active_users_count(now - timedelta(hours=24))
        active_7d = await self._analytics.active_users_count(now - timedelta(days=7))

        return {"daily": daily, "active_24h": active_24h, "active_7d": active_7d}

    async def retention(self, start: datetime | None = None, end: datetime | None = None) -> dict:
        if end is None:
            end = datetime.now(timezone.utc)
        if start is None:
            start = end - timedelta(days=90)

        data = await self._analytics.retention_by_day(start, end)
        avg_7d = sum(d["retention_7_rate"] for d in data) / len(data) if data else 0.0
        avg_30d = sum(d["retention_30_rate"] for d in data) / len(data) if data else 0.0

        return {"retention_data": data, "average_7d": round(avg_7d, 2), "average_30d": round(avg_30d, 2)}

    async def cohort_retention(self, start: datetime | None = None, end: datetime | None = None) -> list[dict]:
        if end is None:
            end = datetime.now(timezone.utc)
        if start is None:
            start = end - timedelta(days=90)
        return await self._analytics.cohort_retention(start, end)

    async def summary(self) -> dict:
        return await self._analytics.summary_stats()
