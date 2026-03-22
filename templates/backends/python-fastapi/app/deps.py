"""Per-request dependency injection for services and repositories."""
from __future__ import annotations

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.platform.jwt import JWTManager
from app.platform.email import EmailSender
from app.platform.captcha import CaptchaVerifier
from app.platform.geoip import GeoIPResolver
from app.repository.admin_action_repo import AdminActionRepository
from app.repository.analytics_repo import AnalyticsRepository
from app.repository.login_event_repo import LoginEventRepository
from app.repository.settings_repo import SettingsRepository
from app.repository.token_repo import TokenRepository
from app.repository.twofa_repo import TwoFARepository
from app.repository.user_repo import UserRepository
from app.service.admin_user_service import AdminUserService
from app.service.analytics_service import AnalyticsService
from app.service.auth_service import AuthService
from app.service.oauth_service import OAuthService
from app.service.password_service import PasswordService
from app.service.settings_service import SettingsService
from app.service.token_service import TokenService
from app.service.twofa_service import TwoFAService
from app.service.user_service import UserService


def get_user_repo(session: AsyncSession = Depends(get_session)) -> UserRepository:
    return UserRepository(session)


def get_token_repo(session: AsyncSession = Depends(get_session)) -> TokenRepository:
    return TokenRepository(session)


def get_twofa_repo(session: AsyncSession = Depends(get_session)) -> TwoFARepository:
    return TwoFARepository(session)


def get_login_event_repo(session: AsyncSession = Depends(get_session)) -> LoginEventRepository:
    return LoginEventRepository(session)


def get_admin_action_repo(session: AsyncSession = Depends(get_session)) -> AdminActionRepository:
    return AdminActionRepository(session)


def get_settings_repo(session: AsyncSession = Depends(get_session)) -> SettingsRepository:
    return SettingsRepository(session)


def get_analytics_repo(session: AsyncSession = Depends(get_session)) -> AnalyticsRepository:
    return AnalyticsRepository(session)


def get_token_service(
    request: Request,
    token_repo: TokenRepository = Depends(get_token_repo),
) -> TokenService:
    return TokenService(token_repo, request.app.state.jwt_manager)


def get_auth_service(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repo),
    token_repo: TokenRepository = Depends(get_token_repo),
    login_event_repo: LoginEventRepository = Depends(get_login_event_repo),
    settings_repo: SettingsRepository = Depends(get_settings_repo),
    token_svc: TokenService = Depends(get_token_service),
) -> AuthService:
    return AuthService(
        users=user_repo,
        tokens=token_repo,
        login_events=login_event_repo,
        settings=settings_repo,
        token_svc=token_svc,
        email_sender=request.app.state.email_sender,
        captcha=request.app.state.captcha_verifier,
        geoip=request.app.state.geoip_resolver,
        frontend_url=request.app.state.frontend_url,
    )


def get_password_service(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repo),
    token_repo: TokenRepository = Depends(get_token_repo),
    token_svc: TokenService = Depends(get_token_service),
) -> PasswordService:
    return PasswordService(
        users=user_repo,
        tokens=token_repo,
        token_svc=token_svc,
        email_sender=request.app.state.email_sender,
        frontend_url=request.app.state.frontend_url,
    )


def get_twofa_service(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repo),
    twofa_repo: TwoFARepository = Depends(get_twofa_repo),
    login_event_repo: LoginEventRepository = Depends(get_login_event_repo),
    token_svc: TokenService = Depends(get_token_service),
) -> TwoFAService:
    return TwoFAService(
        users=user_repo,
        twofa_repo=twofa_repo,
        login_events=login_event_repo,
        token_svc=token_svc,
        email_sender=request.app.state.email_sender,
    )


def get_oauth_service(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repo),
    login_event_repo: LoginEventRepository = Depends(get_login_event_repo),
    token_svc: TokenService = Depends(get_token_service),
) -> OAuthService:
    return OAuthService(
        users=user_repo,
        login_events=login_event_repo,
        token_svc=token_svc,
        geoip=request.app.state.geoip_resolver,
        google_client_id=request.app.state.google_client_id,
    )


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repo),
) -> UserService:
    return UserService(users=user_repo)


def get_admin_user_service(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repo),
    admin_action_repo: AdminActionRepository = Depends(get_admin_action_repo),
) -> AdminUserService:
    return AdminUserService(
        users=user_repo,
        admin_actions=admin_action_repo,
        email_sender=request.app.state.email_sender,
    )


def get_analytics_service(
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repo),
) -> AnalyticsService:
    return AnalyticsService(analytics_repo=analytics_repo)


def get_settings_service(
    settings_repo: SettingsRepository = Depends(get_settings_repo),
) -> SettingsService:
    return SettingsService(settings_repo=settings_repo)
