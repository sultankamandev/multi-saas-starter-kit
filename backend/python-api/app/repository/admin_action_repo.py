from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.admin_action import AdminAction


class AdminActionRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, action: AdminAction) -> None:
        self._session.add(action)
        await self._session.flush()

    async def list_actions(self, page: int, limit: int) -> tuple[list[AdminAction], int]:
        count_stmt = select(func.count(AdminAction.id))
        total_result = await self._session.execute(count_stmt)
        total = total_result.scalar() or 0

        offset = (page - 1) * limit
        stmt = select(AdminAction).order_by(AdminAction.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        actions = list(result.scalars().all())
        return actions, total
