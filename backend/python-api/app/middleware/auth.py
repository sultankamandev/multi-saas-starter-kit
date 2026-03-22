from __future__ import annotations

from fastapi import Depends, HTTPException, Request

from app.platform.jwt import Claims, JWTManager


def get_jwt_manager(request: Request) -> JWTManager:
    return request.app.state.jwt_manager


def get_current_user(
    request: Request,
    jwt_manager: JWTManager = Depends(get_jwt_manager),
) -> Claims:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "Authorization header missing or invalid", "error_code": "MISSING_TOKEN"},
        )

    token_str = auth_header.removeprefix("Bearer ")
    try:
        claims = jwt_manager.validate(token_str)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired token", "error_code": "INVALID_TOKEN"},
        )
    return claims


def get_current_user_id(claims: Claims = Depends(get_current_user)) -> int:
    return claims.user_id
