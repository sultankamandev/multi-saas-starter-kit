from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import (
    get_auth_service,
    get_oauth_service,
    get_password_service,
    get_twofa_service,
    get_user_repo,
)
from app.domain.errors import DomainError, TwoFARequiredError
from app.dto.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LogoutRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    Resend2FARequest,
    TwoFARequiredResponse,
    UseRecoveryCodeRequest,
    Verify2FARequest,
    Verify2FASetupRequest,
    VerifyTOTPLoginRequest,
)
from app.dto.user import user_to_response
from app.i18n.loader import t
from app.middleware.auth import get_current_user_id
from app.middleware.language import get_language
from app.repository.user_repo import UserRepository
from app.router.helpers import error_response
from app.service.auth_service import AuthService
from app.service.oauth_service import OAuthService
from app.service.password_service import PasswordService
from app.service.twofa_service import TwoFAService

router = APIRouter(prefix="/auth", tags=["auth"])


def _login_response(user, pair, lang: str) -> dict:
    return {
        "message": t("LoginSuccess", lang),
        "user": user_to_response(user).model_dump(),
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "expires_in": pair.expires_in,
        "token_type": pair.token_type,
    }


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    auth_svc: AuthService = Depends(get_auth_service),
):
    try:
        result = await auth_svc.register(body, request.client.host if request.client else "0.0.0.0", session)
    except DomainError as e:
        return error_response(e)
    msg = t("UserRegisteredPleaseVerify" if result.verification_required else "UserRegisteredSuccess", lang)
    return {"message": msg, "user": user_to_response(result.user).model_dump()}


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    auth_svc: AuthService = Depends(get_auth_service),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
    user_repo: UserRepository = Depends(get_user_repo),
):
    try:
        result = await auth_svc.login(body, request.client.host if request.client else "0.0.0.0", request.headers.get("User-Agent", ""), session)
    except TwoFARequiredError as e:
        if e.two_fa_type == "email":
            try:
                u = await user_repo.find_by_public_id(e.user_id)
                await twofa_svc.send_2fa_code(u.id, body.remember_me, session)
            except Exception:
                pass
        return TwoFARequiredResponse(
            two_fa_type=e.two_fa_type, user_id=e.user_id,
            message=t("TwoFactorCodeSent" if e.two_fa_type == "email" else "TOTPCodeRequired", lang),
        ).model_dump()
    except DomainError as e:
        return error_response(e)
    return _login_response(result.user, result.token_pair, lang)


@router.post("/google-login")
@router.post("/google")
async def google_login(
    body: GoogleLoginRequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    oauth_svc: OAuthService = Depends(get_oauth_service),
):
    try:
        result = await oauth_svc.google_login(
            body.token, body.remember_me,
            request.client.host if request.client else "0.0.0.0",
            request.headers.get("User-Agent", ""), session,
        )
    except DomainError as e:
        return error_response(e)
    if result.requires_2fa:
        return TwoFARequiredResponse(
            two_fa_type=result.two_fa_type, user_id=result.user.public_id,
            message=t("TOTPCodeRequired", lang),
        ).model_dump()
    return _login_response(result.user, result.token_pair, lang)


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    pwd_svc: PasswordService = Depends(get_password_service),
):
    await pwd_svc.forgot_password(body.email, lang, session)
    return {"message": t("ResetLinkSent", lang)}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    pwd_svc: PasswordService = Depends(get_password_service),
):
    try:
        await pwd_svc.reset_password(body.token, body.new_password, session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("PasswordResetSuccess", lang)}


@router.get("/verify-email")
async def verify_email(
    token: str,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    pwd_svc: PasswordService = Depends(get_password_service),
):
    try:
        await pwd_svc.verify_email(token, session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("EmailVerifiedSuccess", lang)}


@router.post("/refresh-token")
async def refresh_token(
    body: RefreshTokenRequest,
    session: AsyncSession = Depends(get_session),
    auth_svc: AuthService = Depends(get_auth_service),
):
    try:
        pair = await auth_svc.refresh_token(body.refresh_token, session)
    except DomainError as e:
        return error_response(e)
    return pair.model_dump()


@router.post("/logout")
async def logout(
    body: LogoutRequest,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    auth_svc: AuthService = Depends(get_auth_service),
):
    await auth_svc.logout(body.refresh_token, session)
    return {"message": t("LoggedOutSuccess", lang)}


@router.post("/logout-all")
async def logout_all(
    lang: str = Depends(get_language),
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    auth_svc: AuthService = Depends(get_auth_service),
):
    await auth_svc.logout_all(user_id, session)
    return {"message": t("LoggedOutSuccess", lang)}


@router.get("/me")
async def get_me(
    user_id: int = Depends(get_current_user_id),
    auth_svc: AuthService = Depends(get_auth_service),
):
    user = await auth_svc.get_me(user_id)
    return {"user": user_to_response(user).model_dump()}


@router.get("/dashboard")
async def dashboard(
    lang: str = Depends(get_language),
    user_id: int = Depends(get_current_user_id),
    auth_svc: AuthService = Depends(get_auth_service),
):
    user = await auth_svc.get_me(user_id)
    return {
        "message": t("WelcomeDashboard", lang),
        "user": user_to_response(user).model_dump(),
        "dashboard": {
            "title": t("DashboardTitle", lang),
            "features": [t("ViewProfile", lang), t("UpdatePersonalInfo", lang), t("AccessAppFeatures", lang)],
        },
    }


@router.post("/verify-2fa")
async def verify_2fa(
    body: Verify2FARequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        user, pair = await twofa_svc.verify_2fa(
            body.user_id, body.code,
            request.client.host if request.client else "0.0.0.0",
            request.headers.get("User-Agent", ""), session,
        )
    except DomainError as e:
        return error_response(e)
    return _login_response(user, pair, lang)


@router.post("/resend-2fa")
async def resend_2fa(
    body: Resend2FARequest,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        await twofa_svc.resend_2fa(body.user_id, session)
    except DomainError as e:
        return error_response(e)
    return {"message": t("TwoFactorCodeSent", lang)}


@router.post("/verify-totp-login")
async def verify_totp_login(
    body: VerifyTOTPLoginRequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        user, pair = await twofa_svc.verify_totp_login(
            body.user_id, body.code, body.remember_me,
            request.client.host if request.client else "0.0.0.0",
            request.headers.get("User-Agent", ""), session,
        )
    except DomainError as e:
        return error_response(e)
    return _login_response(user, pair, lang)


@router.post("/verify-recovery-code")
async def verify_recovery_code(
    body: UseRecoveryCodeRequest,
    request: Request,
    lang: str = Depends(get_language),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        user, pair = await twofa_svc.use_recovery_code(
            body.user_id, body.code, body.remember_me,
            request.client.host if request.client else "0.0.0.0",
            request.headers.get("User-Agent", ""), session,
        )
    except DomainError as e:
        return error_response(e)
    resp = _login_response(user, pair, lang)
    resp["message"] = t("RecoveryCodeUsed", lang)
    return resp


@router.post("/2fa/setup")
async def setup_2fa(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        return await twofa_svc.setup_2fa(user_id, session)
    except DomainError as e:
        return error_response(e)


@router.post("/2fa/verify-setup")
async def verify_2fa_setup(
    body: Verify2FASetupRequest,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    twofa_svc: TwoFAService = Depends(get_twofa_service),
):
    try:
        return await twofa_svc.verify_2fa_setup(user_id, body.code, session)
    except DomainError as e:
        return error_response(e)
