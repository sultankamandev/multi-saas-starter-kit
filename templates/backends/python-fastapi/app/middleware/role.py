from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException

from app.middleware.auth import get_current_user
from app.platform.jwt import Claims


def require_role(*allowed_roles: str) -> Callable[..., Claims]:
    def _check(claims: Claims = Depends(get_current_user)) -> Claims:
        if claims.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "You do not have permission to access this resource",
                    "error_code": "INSUFFICIENT_ROLE",
                },
            )
        return claims

    return _check
