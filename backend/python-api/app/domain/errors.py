from __future__ import annotations


class DomainError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class TwoFARequiredError(Exception):
    def __init__(self, two_fa_type: str, user_id: str, message: str = ""):
        self.two_fa_type = two_fa_type
        self.user_id = user_id
        self.message = message
        super().__init__(message)


ERR_NOT_FOUND = "NOT_FOUND"
ERR_CONFLICT = "CONFLICT"
ERR_UNAUTHORIZED = "UNAUTHORIZED"
ERR_FORBIDDEN = "FORBIDDEN"
ERR_INVALID_INPUT = "INVALID_INPUT"
ERR_TOKEN_INVALID = "TOKEN_INVALID"
ERR_TOKEN_EXPIRED = "TOKEN_EXPIRED"
ERR_TOKEN_REVOKED = "TOKEN_REVOKED"
ERR_INTERNAL = "INTERNAL"

HTTP_STATUS_MAP = {
    ERR_NOT_FOUND: 404,
    ERR_CONFLICT: 409,
    ERR_UNAUTHORIZED: 401,
    ERR_FORBIDDEN: 403,
    ERR_INVALID_INPUT: 400,
    ERR_TOKEN_INVALID: 401,
    ERR_TOKEN_EXPIRED: 401,
    ERR_TOKEN_REVOKED: 401,
    ERR_INTERNAL: 500,
}
