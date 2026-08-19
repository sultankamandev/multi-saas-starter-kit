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

# Canonical setting keys. These must match the Go and Node templates exactly:
# TEMPLATE_SPEC says every backend targets the same PostgreSQL schema, so a DB
# touched by more than one backend must not end up with divergent rows. This
# template previously also wrote "email_verification_required" and "2fa_required",
# which polluted a shared database with duplicate, conflicting settings.
KEY_EMAIL_VERIFICATION = "require_email_verification"
KEY_2FA = "require_2fa"


class SettingValue(BaseModel):
    value: str


class VerificationToggleBody(BaseModel):
    require_email_verification: bool


class Require2FABody(BaseModel):
    require_2fa: bool


def _truthy_string(val: str) -> bool:
    return val.lower() in ("true", "1", "yes")


async def _toggle_state(
    settings_svc: SettingsService, key: str, default: bool
) -> tuple[bool, str]:
    raw = await settings_svc.get(key)
    if not raw:
        return default, "default"
    return _truthy_string(raw), "database"


@router.get("")
async def get_all_settings(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    # Contract: a bare array.
    settings = await settings_svc.get_all()
    return [{"id": s.id, "key": s.key, "value": s.value} for s in settings]


@router.get("/email-verification")
async def get_email_verification(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    required, source = await _toggle_state(settings_svc, KEY_EMAIL_VERIFICATION, True)
    return {"require_email_verification": required, "source": source}


@router.put("/email-verification")
async def set_email_verification(
    body: VerificationToggleBody,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
    session: AsyncSession = Depends(get_session),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    val = "true" if body.require_email_verification else "false"
    await settings_svc.set(KEY_EMAIL_VERIFICATION, val, session)
    return {
        "message": t("SettingUpdatedSuccessfully", lang),
        "require_email_verification": body.require_email_verification,
    }


@router.get("/2fa")
async def get_2fa_setting(
    claims: Claims = Depends(require_role("admin")),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    required, source = await _toggle_state(settings_svc, KEY_2FA, False)
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
    await settings_svc.set(KEY_2FA, val, session)
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
