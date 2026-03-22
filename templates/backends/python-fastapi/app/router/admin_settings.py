from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import get_settings_service
from app.i18n.loader import t
from app.middleware.language import get_language
from app.middleware.role import require_role
from app.platform.jwt import Claims
from app.service.settings_service import SettingsService

router = APIRouter(prefix="/api/admin/settings", tags=["admin-settings"])


class SettingValue(BaseModel):
    value: str


@router.get("")
async def get_all_settings(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    settings = await settings_svc.get_all()
    return {"data": [{"id": s.id, "key": s.key, "value": s.value} for s in settings]}


@router.get("/email-verification")
async def get_email_verification(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = await settings_svc.get("email_verification_required")
    return {"key": "email_verification_required", "value": val}


@router.put("/email-verification")
async def set_email_verification(
    body: SettingValue,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    await settings_svc.set("email_verification_required", body.value, session)
    return {"message": t("SettingUpdatedSuccessfully", lang)}


@router.get("/2fa")
async def get_2fa_setting(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = await settings_svc.get("2fa_required")
    return {"key": "2fa_required", "value": val}


@router.put("/2fa")
async def set_2fa_setting(
    body: SettingValue,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    await settings_svc.set("2fa_required", body.value, session)
    return {"message": t("SettingUpdatedSuccessfully", lang)}


@router.get("/{key}")
async def get_setting(
    key: str,
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = await settings_svc.get(key)
    return {"key": key, "value": val}


@router.put("/{key}")
async def set_setting(
    key: str,
    body: SettingValue,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    await settings_svc.set(key, body.value, session)
    return {"message": t("SettingUpdatedSuccessfully", lang)}
