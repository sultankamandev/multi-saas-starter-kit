from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import ERR_NOT_FOUND, DomainError
from app.domain.login_event import LoginEvent
from app.domain.token import EmailVerificationToken, PasswordResetToken, RefreshToken
from app.domain.twofa import RecoveryCode, TwoFactorToken
from app.domain.user import User
from app.dto.admin import UserListParams

ALLOWED_SORT_COLUMNS = {"id", "first_name", "last_name", "email", "role", "language", "created_at", "updated_at"}


class UserRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_by_id(self, user_id: int) -> User:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise DomainError(ERR_NOT_FOUND, "User not found")
        return user

    async def find_by_public_id(self, public_id: str) -> User:
        stmt = select(User).where(User.public_id == public_id, User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise DomainError(ERR_NOT_FOUND, "User not found")
        return user

    async def find_by_email(self, email: str) -> User:
        stmt = select(User).where(func.lower(User.email) == email.lower(), User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise DomainError(ERR_NOT_FOUND, "User not found")
        return user

    async def find_by_email_unscoped(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.lower())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_username(self, username: str) -> User:
        stmt = select(User).where(func.lower(User.username) == username.lower(), User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise DomainError(ERR_NOT_FOUND, "User not found")
        return user

    async def find_by_email_or_username(self, identifier: str) -> User:
        stmt = select(User).where(
            or_(
                func.lower(User.email) == identifier.lower(),
                func.lower(User.username) == identifier.lower(),
            ),
            User.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            raise DomainError(ERR_NOT_FOUND, "User not found")
        return user

    async def is_username_available(self, username: str, exclude_id: int | None = None) -> bool:
        stmt = select(User.id).where(func.lower(User.username) == username.lower(), User.deleted_at.is_(None))
        if exclude_id:
            stmt = stmt.where(User.id != exclude_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is None

    async def create(self, user: User) -> None:
        self._session.add(user)
        await self._session.flush()

    async def update(self, user: User) -> None:
        await self._session.flush()

    async def soft_delete(self, user_id: int) -> None:
        await self._session.execute(
            update(User).where(User.id == user_id).values(deleted_at=datetime.now(timezone.utc))
        )
        await self._session.flush()

    async def hard_delete(self, user_id: int) -> None:
        await self._session.execute(delete(User).where(User.id == user_id))
        await self._session.flush()

    async def hard_delete_related_records(self, user_id: int) -> None:
        for model in (EmailVerificationToken, TwoFactorToken, RefreshToken, RecoveryCode, PasswordResetToken, LoginEvent):
            await self._session.execute(delete(model).where(model.user_id == user_id))
        await self._session.flush()

    async def list_users(self, params: UserListParams) -> tuple[list[User], int]:
        base = select(User).where(User.deleted_at.is_(None))
        count_stmt = select(func.count(User.id)).where(User.deleted_at.is_(None))

        if params.search:
            pattern = f"%{params.search}%"
            search_filter = or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                func.concat(User.first_name, " ", User.last_name).ilike(pattern),
            )
            base = base.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        total_result = await self._session.execute(count_stmt)
        total = total_result.scalar() or 0

        sort_col = params.sort_field if params.sort_field in ALLOWED_SORT_COLUMNS else "id"
        col = getattr(User, sort_col)
        order = col.desc() if params.sort_order.upper() == "DESC" else col.asc()
        offset = (params.page - 1) * params.limit

        stmt = base.order_by(order).offset(offset).limit(params.limit)
        result = await self._session.execute(stmt)
        users = list(result.scalars().all())
        return users, total

    async def count(self) -> int:
        r = await self._session.execute(select(func.count(User.id)).where(User.deleted_at.is_(None)))
        return r.scalar() or 0

    async def count_verified(self) -> int:
        r = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None), User.verified.is_(True))
        )
        return r.scalar() or 0

    async def count_by_role(self, role: str) -> int:
        r = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None), User.role == role)
        )
        return r.scalar() or 0

    async def count_since(self, since: datetime) -> int:
        r = await self._session.execute(
            select(func.count(User.id)).where(User.deleted_at.is_(None), User.created_at >= since)
        )
        return r.scalar() or 0
