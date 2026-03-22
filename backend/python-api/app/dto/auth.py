from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    email: EmailStr
    password: str = Field(min_length=8)
    recaptcha_token: str = ""
    language: str = ""
    country: str = ""


class LoginRequest(BaseModel):
    email_or_username: str
    password: str
    recaptcha_token: str = ""
    remember_me: bool = False


class LoginResponse(BaseModel):
    message: str
    user: dict | None = None
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class TwoFARequiredResponse(BaseModel):
    requires_2fa: bool = True
    two_fa_type: str
    user_id: str
    message: str


class Verify2FARequest(BaseModel):
    user_id: str
    code: str


class Resend2FARequest(BaseModel):
    user_id: str


class VerifyTOTPLoginRequest(BaseModel):
    user_id: str
    code: str
    remember_me: bool = False


class UseRecoveryCodeRequest(BaseModel):
    user_id: str
    code: str
    remember_me: bool = False


class Setup2FAResponse(BaseModel):
    otpauth_url: str
    secret: str
    message: str


class Verify2FASetupRequest(BaseModel):
    code: str


class Verify2FASetupResponse(BaseModel):
    message: str
    recovery_codes: list[str]
    warning: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class GoogleLoginRequest(BaseModel):
    token: str
    remember_me: bool = False


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"
