from __future__ import annotations

import asyncio
import logging

from passlib.hash import bcrypt

from app.domain.admin_action import AdminAction
from app.domain.errors import ERR_CONFLICT, ERR_INVALID_INPUT, DomainError
from app.domain.user import User
from app.dto.admin import AdminCreateUserRequest, AdminUpdateUserRequest, AdminUpdateRoleRequest, UserListParams
from app.i18n.loader import is_language_supported
from app.platform.email import EmailSender
from app.repository.admin_action_repo import AdminActionRepository
from app.repository.user_repo import UserRepository

logger = logging.getLogger(__name__)


class AdminUserService:
    def __init__(
        self,
        users: UserRepository,
        admin_actions: AdminActionRepository,
        email_sender: EmailSender,
    ):
        self._users = users
        self._admin_actions = admin_actions
        self._email = email_sender

    async def list_users(self, params: UserListParams) -> tuple[list[User], int]:
        return await self._users.list_users(params)

    async def get_by_id(self, user_id: int) -> User:
        return await self._users.find_by_id(user_id)

    async def create_user(
        self, req: AdminCreateUserRequest, admin_id: int, admin_email: str, session
    ) -> User:
        existing = await self._users.find_by_email_unscoped(req.email)
        if existing and not existing.is_deleted:
            raise DomainError(ERR_CONFLICT, "User already exists")

        if req.role not in ("user", "admin"):
            raise DomainError(ERR_INVALID_INPUT, "Invalid role")

        lang = req.language.lower() if req.language and is_language_supported(req.language.lower()) else "en"
        password_hash = bcrypt.using(rounds=12).hash(req.password)

        user = User(
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            password_hash=password_hash,
            role=req.role,
            language=lang,
            verified=req.verified if req.verified is not None else False,
        )
        await self._users.create(user)

        action = AdminAction(
            admin_id=admin_id,
            admin_email=admin_email,
            action="create_user",
            target_user_id=user.id,
            target_email=user.email,
            message=f"Created user {user.email} with role {user.role}",
        )
        await self._admin_actions.create(action)
        await session.commit()
        return user

    async def update_user(
        self, user_id: int, req: AdminUpdateUserRequest, admin_id: int, admin_email: str, session
    ) -> User:
        user = await self._users.find_by_id(user_id)
        old_role = user.role

        if req.first_name is not None:
            user.first_name = req.first_name
        if req.last_name is not None:
            user.last_name = req.last_name
        if req.email is not None:
            user.email = req.email
        if req.password is not None:
            user.password_hash = bcrypt.using(rounds=12).hash(req.password)
        if req.role is not None:
            if req.role not in ("user", "admin"):
                raise DomainError(ERR_INVALID_INPUT, "Invalid role")
            user.role = req.role
        if req.language is not None:
            if is_language_supported(req.language.lower()):
                user.language = req.language.lower()
        if req.country is not None:
            user.country = req.country.upper()[:10]
        if req.address is not None:
            user.address = req.address
        if req.phone is not None:
            user.phone = req.phone
        if req.verified is not None:
            user.verified = req.verified
        if req.two_fa_enabled is not None:
            user.two_fa_enabled = req.two_fa_enabled
            if not req.two_fa_enabled:
                user.two_fa_secret = None

        await self._users.update(user)

        action = AdminAction(
            admin_id=admin_id,
            admin_email=admin_email,
            action="update_user",
            target_user_id=user.id,
            target_email=user.email,
            message=f"Updated user {user.email}",
        )
        await self._admin_actions.create(action)
        await session.commit()

        if req.role and req.role != old_role:
            asyncio.create_task(
                self._email.send_role_change(user.email, user.language or "en", user.full_name, old_role, user.role)
            )

        return user

    async def delete_user(self, user_id: int, admin_id: int, admin_email: str, session) -> None:
        user = await self._users.find_by_id(user_id)

        action = AdminAction(
            admin_id=admin_id,
            admin_email=admin_email,
            action="delete_user",
            target_user_id=user.id,
            target_email=user.email,
            message=f"Deleted user {user.email}",
        )
        await self._admin_actions.create(action)
        await self._users.soft_delete(user.id)
        await session.commit()

        asyncio.create_task(
            self._email.send_account_deleted(user.email, user.language or "en", user.full_name, user.email)
        )

    async def update_role(
        self, user_id: int, req: AdminUpdateRoleRequest, admin_id: int, admin_email: str, session
    ) -> User:
        if req.role not in ("user", "admin"):
            raise DomainError(ERR_INVALID_INPUT, "Invalid role")

        user = await self._users.find_by_id(user_id)
        old_role = user.role
        user.role = req.role
        await self._users.update(user)

        action = AdminAction(
            admin_id=admin_id,
            admin_email=admin_email,
            action="update_role",
            target_user_id=user.id,
            target_email=user.email,
            message=f"Changed role from {old_role} to {req.role}",
        )
        await self._admin_actions.create(action)
        await session.commit()

        asyncio.create_task(
            self._email.send_role_change(user.email, user.language or "en", user.full_name, old_role, user.role)
        )
        return user

    async def stats(self) -> dict:
        total = await self._users.count()
        admin_count = await self._users.count_by_role("admin")
        user_count = await self._users.count_by_role("user")
        return {"total_users": total, "admin_users": admin_count, "regular_users": user_count}

    async def get_actions(self, page: int, limit: int) -> tuple[list[AdminAction], int]:
        return await self._admin_actions.list_actions(page, limit)
