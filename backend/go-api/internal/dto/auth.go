package dto

type RegisterRequest struct {
	Username       string `json:"username" binding:"required"`
	FirstName      string `json:"first_name" binding:"required"`
	LastName       string `json:"last_name" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8,max=255"`
	RecaptchaToken string `json:"recaptcha_token"`
	Language       string `json:"language,omitempty"`
	Country        string `json:"country,omitempty"`
}

type LoginRequest struct {
	EmailOrUsername string `json:"email_or_username" binding:"required"`
	Password       string `json:"password" binding:"required"`
	RecaptchaToken string `json:"recaptcha_token"`
	RememberMe     bool   `json:"remember_me"`
}

type LoginResponse struct {
	Message      string       `json:"message"`
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int          `json:"expires_in"`
	TokenType    string       `json:"token_type"`
}

type TwoFARequiredResponse struct {
	Requires2FA bool   `json:"requires_2fa"`
	TwoFAType   string `json:"two_fa_type"`
	UserID      string `json:"user_id"`
	Message     string `json:"message"`
}

type Verify2FARequest struct {
	UserID string `json:"user_id" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

type Resend2FARequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type VerifyTOTPLoginRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	Code       string `json:"code" binding:"required"`
	RememberMe bool   `json:"remember_me"`
}

type UseRecoveryCodeRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	Code       string `json:"code" binding:"required"`
	RememberMe bool   `json:"remember_me"`
}

type Setup2FAResponse struct {
	OTPAuthURL string `json:"otpauth_url"`
	Secret     string `json:"secret"`
	Message    string `json:"message"`
}

type Verify2FASetupRequest struct {
	Code string `json:"code" binding:"required"`
}

type Verify2FASetupResponse struct {
	Message       string   `json:"message"`
	RecoveryCodes []string `json:"recovery_codes"`
	Warning       string   `json:"warning"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type RefreshTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8,max=255"`
}

type GoogleLoginRequest struct {
	Token      string `json:"token" binding:"required"`
	RememberMe bool   `json:"remember_me"`
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}
