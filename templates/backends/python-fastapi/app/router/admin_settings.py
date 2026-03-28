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


class VerificationToggleBody(BaseModel):
    require_email_verification: bool


class Require2FABody(BaseModel):
    require_2fa: bool


def _truthy_string(val: str) -> bool:
    return val.lower() in ("true", "1", "yes")


async def _verification_state(settings_svc: SettingsService) -> tuple[bool, str]:
    primary = await settings_svc.get("require_email_verification")
    legacy = await settings_svc.get("email_verification_required")
    raw = primary or legacy
    if not raw:
        return True, "default"
    return _truthy_string(raw), "database"


async def _global_2fa_state(settings_svc: SettingsService) -> tuple[bool, str]:
    primary = await settings_svc.get("require_2fa")
    legacy = await settings_svc.get("2fa_required")
    raw = primary or legacy
    if not raw:
        return False, "default"
    return _truthy_string(raw), "database"


@router.get("")
async def get_all_settings(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    settings = await settings_svc.get_all()
    rows = [{"id": s.id, "key": s.key, "value": s.value} for s in settings]
    # Go / React-Admin convention
    return {"settings": rows, "count": len(rows)}


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


@router.get("/verification/status")
async def get_verification_status(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    required, source = await _verification_state(settings_svc)
    return {"require_email_verification": required, "source": source}


@router.put("/verification")
async def update_verification_toggle(
    body: VerificationToggleBody,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = "true" if body.require_email_verification else "false"
    await settings_svc.set("require_email_verification", val, session)
    await settings_svc.set("email_verification_required", val, session)
    return {
        "message": t("SettingUpdatedSuccessfully", lang),
        "require_email_verification": body.require_email_verification,
    }


@router.get("/2fa")
async def get_2fa_setting(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = await settings_svc.get("2fa_required")
    return {"key": "2fa_required", "value": val}


@router.get("/2fa/status")
async def get_2fa_status(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    required, source = await _global_2fa_state(settings_svc)
    return {"require_2fa": required, "source": source}


@router.put("/2fa")
async def set_2fa_setting(
    body: Require2FABody,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = "true" if body.require_2fa else "false"
    await settings_svc.set("require_2fa", val, session)
    await settings_svc.set("2fa_required", val, session)
    return {
        "message": t("SettingUpdatedSuccessfully", lang),
        "require_2fa": body.require_2fa,
    }


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
