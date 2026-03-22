from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import get_user_service
from app.domain.errors import DomainError
from app.dto.user import UpdateProfileRequest, user_to_response
from app.i18n.loader import t
from app.middleware.auth import get_current_user_id
from app.middleware.language import get_language
from app.router.helpers import error_response
from app.service.user_service import UserService

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile")
async def get_profile(
    lang: str = Depends(get_language),
    user_id: int = Depends(get_current_user_id),
    user_svc: UserService = Depends(get_user_service),
):
    user = await user_svc.get_profile(user_id)
    return {"message": t("UserProfile", lang), "user": user_to_response(user).model_dump()}


@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    lang: str = Depends(get_language),
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    user_svc: UserService = Depends(get_user_service),
):
    try:
        user = await user_svc.update_profile(user_id, body, session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("ProfileUpdated", lang), "user": user_to_response(user).model_dump()}
