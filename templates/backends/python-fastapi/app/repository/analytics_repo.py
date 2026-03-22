from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, cast, distinct, func, select, text, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.login_event import LoginEvent
from app.domain.user import User


class AnalyticsRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def user_registrations_by_day(
        self, start: datetime, end: datetime, country: str | None = None, language: str | None = None
    ) -> list[dict]:
        stmt = (
            select(
                cast(User.created_at, Date).label("date"),
                func.count(User.id).label("registrations"),
                func.count(case((User.verified.is_(True), 1))).label("verified"),
            )
            .where(
                User.deleted_at.is_(None),
                User.created_at >= start,
                User.created_at <= end,
            )
            .group_by(cast(User.created_at, Date))
            .order_by(cast(User.created_at, Date))
        )
        if country:
            stmt = stmt.where(User.country == country)
        if language:
            stmt = stmt.where(User.language == language)

        result = await self._session.execute(stmt)
        return [{"date": str(r.date), "registrations": r.registrations, "verified": r.verified} for r in result]

    async def active_users_by_day(self, start: datetime, end: datetime) -> list[dict]:
        stmt = (
            select(
                cast(LoginEvent.logged_at, Date).label("date"),
                func.count(distinct(LoginEvent.user_id)).label("active_users"),
            )
            .where(LoginEvent.logged_at >= start, LoginEvent.logged_at <= end)
            .group_by(cast(LoginEvent.logged_at, Date))
            .order_by(cast(LoginEvent.logged_at, Date))
        )
        result = await self._session.execute(stmt)
        return [{"date": str(r.date), "active_users": r.active_users} for r in result]

    async def active_users_count(self, since: datetime) -> int:
        stmt = select(func.count(distinct(LoginEvent.user_id))).where(LoginEvent.logged_at >= since)
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def retention_by_day(self, start: datetime, end: datetime) -> list[dict]:
        stmt = text("""
            WITH cohorts AS (
                SELECT id, DATE(created_at) AS signup_date
                FROM users
                WHERE deleted_at IS NULL
                  AND created_at >= :start AND created_at <= :end_date
            ),
            retention AS (
                SELECT
                    c.signup_date,
                    COUNT(DISTINCT c.id) AS new_users,
                    COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '7 days' THEN le.user_id END) AS retained_7d,
                    COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '30 days' THEN le.user_id END) AS retained_30d
                FROM cohorts c
                LEFT JOIN login_events le ON le.user_id = c.id
                GROUP BY c.signup_date
                ORDER BY c.signup_date
            )
            SELECT
                signup_date,
                new_users,
                retained_7d,
                retained_30d,
                CASE WHEN new_users > 0 THEN ROUND(retained_7d::numeric / new_users * 100, 2) ELSE 0 END AS retention_7_rate,
                CASE WHEN new_users > 0 THEN ROUND(retained_30d::numeric / new_users * 100, 2) ELSE 0 END AS retention_30_rate
            FROM retention
        """)
        result = await self._session.execute(stmt, {"start": start, "end_date": end})
        return [
            {
                "signup_date": str(r.signup_date),
                "new_users": r.new_users,
                "retained_7d": r.retained_7d,
                "retained_30d": r.retained_30d,
                "retention_7_rate": float(r.retention_7_rate),
                "retention_30_rate": float(r.retention_30_rate),
            }
            for r in result
        ]

    async def cohort_retention(self, start: datetime, end: datetime) -> list[dict]:
        stmt = text("""
            WITH cohorts AS (
                SELECT id, DATE(created_at) AS signup_date
                FROM users
                WHERE deleted_at IS NULL
                  AND created_at >= :start AND created_at <= :end_date
            )
            SELECT
                c.signup_date,
                COUNT(DISTINCT c.id) AS new_users,
                ROUND(COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '1 day' AND le.logged_at < c.signup_date + INTERVAL '2 days' THEN le.user_id END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS day_1,
                ROUND(COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '3 days' AND le.logged_at < c.signup_date + INTERVAL '4 days' THEN le.user_id END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS day_3,
                ROUND(COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '7 days' AND le.logged_at < c.signup_date + INTERVAL '8 days' THEN le.user_id END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS day_7,
                ROUND(COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '14 days' AND le.logged_at < c.signup_date + INTERVAL '15 days' THEN le.user_id END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS day_14,
                ROUND(COUNT(DISTINCT CASE WHEN le.logged_at >= c.signup_date + INTERVAL '30 days' AND le.logged_at < c.signup_date + INTERVAL '31 days' THEN le.user_id END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2) AS day_30
            FROM cohorts c
            LEFT JOIN login_events le ON le.user_id = c.id
            GROUP BY c.signup_date
            ORDER BY c.signup_date
        """)
        result = await self._session.execute(stmt, {"start": start, "end_date": end})
        return [
            {
                "signup_date": str(r.signup_date),
                "new_users": r.new_users,
                "day_1": float(r.day_1 or 0),
                "day_3": float(r.day_3 or 0),
                "day_7": float(r.day_7 or 0),
                "day_14": float(r.day_14 or 0),
                "day_30": float(r.day_30 or 0),
            }
            for r in result
        ]

    async def summary_stats(self) -> dict:
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)

        total = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None))
        )
        total_users = total.scalar() or 0

        verified = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None), User.verified.is_(True))
        )
        verified_users = verified.scalar() or 0

        new = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None), User.created_at >= seven_days_ago)
        )
        new_users_7_days = new.scalar() or 0

        verified_percent = round((verified_users / total_users * 100), 2) if total_users > 0 else 0.0

        return {
            "total_users": total_users,
            "verified_users": verified_users,
            "new_users_7_days": new_users_7_days,
            "verified_percent": verified_percent,
        }
