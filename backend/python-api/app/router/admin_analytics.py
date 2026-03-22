from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.deps import get_analytics_service
from app.domain.errors import ERR_INVALID_INPUT, DomainError
from app.middleware.language import get_language
from app.middleware.role import require_role
from app.platform.jwt import Claims
from app.router.helpers import error_response
from app.service.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/admin/analytics", tags=["admin-analytics"])


def _parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        raise DomainError(ERR_INVALID_INPUT, "Invalid date format")


@router.get("/user-registrations")
async def user_registrations(
    claims: Claims = Depends(require_role("admin")),
    analytics_svc: AnalyticsService = Depends(get_analytics_service),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    country: str | None = Query(None),
    language: str | None = Query(None),
):
    try:
        start = _parse_date(start_date)
        end = _parse_date(end_date)
    except DomainError as e:
        return error_response(e)
    data = await analytics_svc.user_registrations(start, end, country, language)
    return {"data": data}


@router.get("/active-users")
async def active_users(
    claims: Claims = Depends(require_role("admin")),
    analytics_svc: AnalyticsService = Depends(get_analytics_service),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    try:
        start = _parse_date(start_date)
        end = _parse_date(end_date)
    except DomainError as e:
        return error_response(e)
    return await analytics_svc.active_users(start, end)


@router.get("/retention")
async def retention(
    claims: Claims = Depends(require_role("admin")),
    analytics_svc: AnalyticsService = Depends(get_analytics_service),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    try:
        start = _parse_date(start_date)
        end = _parse_date(end_date)
    except DomainError as e:
        return error_response(e)
    return await analytics_svc.retention(start, end)


@router.get("/cohort")
async def cohort(
    claims: Claims = Depends(require_role("admin")),
    analytics_svc: AnalyticsService = Depends(get_analytics_service),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    try:
        start = _parse_date(start_date)
        end = _parse_date(end_date)
    except DomainError as e:
        return error_response(e)
    data = await analytics_svc.cohort_retention(start, end)
    return {"data": data}
