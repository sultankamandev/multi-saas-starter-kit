from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import get_admin_user_service, get_analytics_service
from app.domain.errors import DomainError
from app.dto.admin import (
    AdminCreateUserRequest,
    AdminUpdateRoleRequest,
    AdminUpdateUserRequest,
    UserListParams,
)
from app.dto.user import user_to_response, users_to_response
from app.i18n.loader import t
from app.middleware.language import get_language
from app.middleware.role import require_role
from app.platform.jwt import Claims
from app.router.helpers import error_response
from app.service.admin_user_service import AdminUserService
from app.service.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_field: str = Query("id"),
    sort_order: str = Query("ASC"),
    search: str = Query("", alias="q"),
):
    params = UserListParams(page=page, limit=limit, sort_field=sort_field, sort_order=sort_order, search=search)
    users, total = await admin_svc.list_users(params)
    # jsonable_encoder converts datetimes to ISO strings; JSONResponse's raw
    # json.dumps does not, which previously 500'd the whole list endpoint.
    body = jsonable_encoder({"data": users_to_response(users), "total": total, "page": page, "limit": limit})
    resp = JSONResponse(content=body)
    resp.headers["X-Total-Count"] = str(total)
    return resp


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
):
    try:
        user = await admin_svc.get_by_id(user_id)
    except DomainError as e:
        return error_response(e)
    return {"message": t("UserFound", lang), "user": user_to_response(user).model_dump()}


@router.post("/users", status_code=201)
async def create_user(
    body: AdminCreateUserRequest,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
):
    try:
        user = await admin_svc.create_user(body, claims.user_id, "", session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("UserCreated", lang), "user": user_to_response(user).model_dump()}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    body: AdminUpdateUserRequest,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
):
    try:
        user = await admin_svc.update_user(user_id, body, claims.user_id, "", session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("UserUpdated", lang), "user": user_to_response(user).model_dump()}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
):
    try:
        await admin_svc.delete_user(user_id, claims.user_id, "", session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("UserDeleted", lang)}


@router.put("/users/{user_id}/role")
async def update_role(
    user_id: int,
    body: AdminUpdateRoleRequest,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
):
    try:
        user = await admin_svc.update_role(user_id, body, claims.user_id, "", session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("UserRoleUpdated", lang), "user": user_to_response(user).model_dump()}


@router.get("/user-stats")
async def user_stats(
    claims: Claims = Depends(require_role("admin")),
    analytics_svc: AnalyticsService = Depends(get_analytics_service),
):
    # Contract maps user-stats to AdminSummary, identical to /summary.
    return await analytics_svc.summary()


@router.get("/actions")
async def admin_actions(
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    admin_svc: AdminUserService = Depends(get_admin_user_service),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    actions, total = await admin_svc.get_actions(page, limit)
    action_dicts = [
        {
            "id": a.id,
            "admin_id": a.admin_id,
            "admin_email": a.admin_email,
            "action": a.action,
            "target_user_id": a.target_user_id,
            "target_email": a.target_email,
            "message": a.message,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]
    resp = JSONResponse(content={"data": action_dicts, "total": total})
    resp.headers["X-Total-Count"] = str(total)
    return resp
