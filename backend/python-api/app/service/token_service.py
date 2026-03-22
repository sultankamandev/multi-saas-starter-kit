from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from app.domain.errors import ERR_TOKEN_EXPIRED, ERR_TOKEN_INVALID, ERR_TOKEN_REVOKED, DomainError
from app.domain.token import RefreshToken, hash_token
from app.dto.auth import TokenPair
from app.platform.jwt import JWTManager
from app.repository.token_repo import TokenRepository

BCRYPT_COST = 12
ACCESS_TOKEN_DURATION = timedelta(minutes=15)
REFRESH_TOKEN_DURATION = timedelta(hours=24)
REFRESH_TOKEN_REMEMBER_DURATION = timedelta(days=7)


class TokenService:
    def __init__(self, token_repo: TokenRepository, jwt_manager: JWTManager):
        self._tokens = token_repo
        self._jwt = jwt_manager

    async def issue_token_pair(self, user_id: int, role: str, remember_me: bool = False) -> TokenPair:
        family_id = secrets.token_hex(16)
        return await self._issue_with_family(user_id, role, remember_me, family_id)

    async def validate_and_revoke_refresh_token(self, raw_token: str) -> tuple[int, str]:
        """Returns (user_id, family_id). Raises on invalid/revoked/expired."""
        token_hash_val = hash_token(raw_token)
        stored = await self._tokens.find_refresh_token_by_hash(token_hash_val)

        if stored is None:
            raise DomainError(ERR_TOKEN_INVALID, "Invalid refresh token")

        if stored.revoked:
            await self._tokens.revoke_token_family(stored.family_id)
            raise DomainError(ERR_TOKEN_REVOKED, "Token reuse detected, all sessions in this family revoked")

        if datetime.now(timezone.utc) > stored.expires_at.replace(tzinfo=timezone.utc):
            raise DomainError(ERR_TOKEN_EXPIRED, "Refresh token expired")

        await self._tokens.revoke_refresh_token_by_hash(token_hash_val)
        return stored.user_id, stored.family_id

    async def issue_rotated_pair(self, user_id: int, role: str, family_id: str) -> TokenPair:
        return await self._issue_with_family(user_id, role, False, family_id)

    async def revoke_refresh_token(self, raw_token: str) -> None:
        await self._tokens.revoke_refresh_token_by_hash(hash_token(raw_token))

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        await self._tokens.revoke_all_user_refresh_tokens(user_id)

    async def _issue_with_family(
        self, user_id: int, role: str, remember_me: bool, family_id: str
    ) -> TokenPair:
        access_token = self._jwt.generate(user_id, role, ACCESS_TOKEN_DURATION)
        raw_rt = secrets.token_hex(32)

        expiry = REFRESH_TOKEN_REMEMBER_DURATION if remember_me else REFRESH_TOKEN_DURATION

        rt = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_rt),
            family_id=family_id,
            expires_at=datetime.now(timezone.utc) + expiry,
        )
        await self._tokens.create_refresh_token(rt)

        return TokenPair(
            access_token=access_token,
            refresh_token=raw_rt,
            expires_in=900,
            token_type="Bearer",
        )
