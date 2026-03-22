from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass

import httpx
from passlib.hash import bcrypt

from app.domain.errors import ERR_INVALID_INPUT, ERR_UNAUTHORIZED, DomainError, TwoFARequiredError
from app.domain.login_event import LoginEvent
from app.domain.user import User
from app.dto.auth import TokenPair
from app.platform.geoip import GeoIPResolver
from app.repository.login_event_repo import LoginEventRepository
from app.repository.user_repo import UserRepository
from app.service.token_service import TokenService

logger = logging.getLogger(__name__)


@dataclass
class GoogleLoginResult:
    user: User
    token_pair: TokenPair | None
    requires_2fa: bool = False
    two_fa_type: str = ""


class OAuthService:
    def __init__(
        self,
        users: UserRepository,
        login_events: LoginEventRepository,
        token_svc: TokenService,
        geoip: GeoIPResolver,
        google_client_id: str,
    ):
        self._users = users
        self._login_events = login_events
        self._token_svc = token_svc
        self._geoip = geoip
        self._google_client_id = google_client_id

    async def google_login(
        self, id_token: str, remember_me: bool, client_ip: str, user_agent: str, session
    ) -> GoogleLoginResult:
        if not self._google_client_id:
            raise DomainError(ERR_INVALID_INPUT, "Google OAuth is not configured")

        payload = await self._verify_google_token(id_token)
        if payload is None:
            raise DomainError(ERR_UNAUTHORIZED, "Invalid Google authentication token")

        email = payload.get("email", "")
        if not email:
            raise DomainError(ERR_UNAUTHORIZED, "Google account email not found")

        first_name = payload.get("given_name", "")
        last_name = payload.get("family_name", "")

        existing = await self._users.find_by_email_unscoped(email)

        if existing and not existing.is_deleted:
            user = existing
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            if not user.verified:
                user.verified = True
            await self._users.update(user)
        else:
            if existing and existing.is_deleted:
                await self._users.hard_delete_related_records(existing.id)
                await self._users.hard_delete(existing.id)

            random_pw = bcrypt.using(rounds=12).hash(secrets.token_hex(32))
            country = await self._geoip.resolve_country(client_ip)

            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password_hash=random_pw,
                role="user",
                verified=True,
                language=payload.get("locale", "en")[:2].lower(),
                country=country or "",
            )
            await self._users.create(user)

        if user.two_fa_enabled:
            await session.commit()
            return GoogleLoginResult(user=user, token_pair=None, requires_2fa=True, two_fa_type="totp")

        pair = await self._token_svc.issue_token_pair(user.id, user.role, remember_me)
        event = LoginEvent(user_id=user.id, ip=client_ip, user_agent=user_agent)
        await self._login_events.create(event)
        await session.commit()

        return GoogleLoginResult(user=user, token_pair=pair)

    async def _verify_google_token(self, id_token: str) -> dict | None:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                if data.get("aud") != self._google_client_id:
                    return None
                return data
        except Exception:
            logger.exception("Google token verification failed")
            return None
