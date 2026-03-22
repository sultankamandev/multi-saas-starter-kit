from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from app.i18n.loader import t
from app.middleware.language import get_language
from app.middleware.role import require_role
from app.platform.jwt import Claims

router = APIRouter(prefix="/api/admin", tags=["admin-blocked-ips"])


@router.get("/blocked-ips")
async def list_blocked_ips(
    request: Request,
    claims: Claims = Depends(require_role("admin")),
):
    rate_limiter = request.app.state.rate_limiter
    blocked = rate_limiter.get_blocked_ips()
    return {
        "data": [
            {
                "ip": b.ip,
                "blocked_at": datetime.fromtimestamp(b.blocked_at, tz=timezone.utc).isoformat() if b.blocked_at else None,
            }
            for b in blocked
        ],
    }


@router.delete("/blocked-ips/{ip}")
async def unblock_ip(
    ip: str,
    request: Request,
    lang: str = Depends(get_language),
    claims: Claims = Depends(require_role("admin")),
):
    rate_limiter = request.app.state.rate_limiter
    ok = rate_limiter.unblock_ip(ip)
    if not ok:
        return {"error": t("IPNotFoundOrNotBlocked", lang), "error_code": "NOT_FOUND"}
    return {"message": t("IPUnblockedSuccessfully", lang)}
