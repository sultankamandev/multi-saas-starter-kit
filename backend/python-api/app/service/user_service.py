from __future__ import annotations

from app.domain.errors import ERR_CONFLICT, ERR_INVALID_INPUT, DomainError
from app.domain.username import normalize_username, validate_username
from app.domain.user import User
from app.dto.user import UpdateProfileRequest
from app.i18n.loader import is_language_supported
from app.repository.user_repo import UserRepository


class UserService:
    def __init__(self, users: UserRepository):
        self._users = users

    async def get_profile(self, user_id: int) -> User:
        return await self._users.find_by_id(user_id)

    async def update_profile(self, user_id: int, req: UpdateProfileRequest, session) -> User:
        user = await self._users.find_by_id(user_id)

        if req.username is not None:
            username = normalize_username(req.username)
            err = validate_username(username)
            if err:
                raise DomainError(ERR_INVALID_INPUT, err)
            available = await self._users.is_username_available(username, exclude_id=user.id)
            if not available:
                raise DomainError(ERR_CONFLICT, "Username already taken")
            user.username = username

        if req.first_name is not None:
            user.first_name = req.first_name
        if req.last_name is not None:
            user.last_name = req.last_name
        if req.language is not None:
            if is_language_supported(req.language.lower()):
                user.language = req.language.lower()
        if req.country is not None:
            user.country = req.country.upper()[:10]
        if req.address is not None:
            user.address = req.address
        if req.phone is not None:
            user.phone = req.phone
        if req.two_fa_enabled is not None:
            user.two_fa_enabled = req.two_fa_enabled
            if not req.two_fa_enabled:
                user.two_fa_secret = None

        await self._users.update(user)
        await session.commit()
        return user
