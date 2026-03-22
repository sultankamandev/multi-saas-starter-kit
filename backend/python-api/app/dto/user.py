from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.domain.user import User


class UserResponse(BaseModel):
    id: str | None = None
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str
    role: str
    language: str | None = None
    country: str | None = None
    address: str | None = None
    phone: str | None = None
    verified: bool
    two_fa_enabled: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language: str | None = None
    country: str | None = None
    address: str | None = None
    phone: str | None = None
    two_fa_enabled: bool | None = None


def user_to_response(u: User) -> UserResponse:
    data = {c.key: getattr(u, c.key) for c in u.__table__.columns if c.key != "id"}
    data["id"] = u.public_id
    return UserResponse(**data)


def users_to_response(users: list[User]) -> list[UserResponse]:
    return [user_to_response(u) for u in users]
