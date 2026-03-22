from __future__ import annotations

from fastapi.responses import JSONResponse

from app.domain.errors import HTTP_STATUS_MAP, DomainError


def error_response(e: DomainError) -> JSONResponse:
    status = HTTP_STATUS_MAP.get(e.code, 500)
    return JSONResponse(
        status_code=status,
        content={"error": e.message, "error_code": e.code},
    )
