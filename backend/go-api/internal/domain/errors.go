package domain

import "errors"

var (
	ErrNotFound         = errors.New("not found")
	ErrConflict         = errors.New("already exists")
	ErrInvalidInput     = errors.New("invalid input")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrTokenExpired     = errors.New("token expired")
	ErrTokenInvalid     = errors.New("invalid token")
	ErrTokenRevoked     = errors.New("token revoked")
	ErrEmailNotVerified = errors.New("email not verified")
	ErrTwoFARequired    = errors.New("2fa required")
	ErrRateLimited      = errors.New("rate limited")
	ErrTooManyAttempts  = errors.New("too many attempts")
)

// DomainError wraps a sentinel error with a user-facing message.
type DomainError struct {
	Err     error
	Message string
}

func (e *DomainError) Error() string { return e.Message }
func (e *DomainError) Unwrap() error { return e.Err }

func NewError(sentinel error, message string) *DomainError {
	return &DomainError{Err: sentinel, Message: message}
}

// TwoFARequiredError carries the 2FA type and user public ID back to the handler.
// Uses the UUID public_id to avoid exposing sequential internal IDs.
type TwoFARequiredError struct {
	PublicID  string
	TwoFAType string // "totp" or "email"
	Message   string
}

func (e *TwoFARequiredError) Error() string { return e.Message }
func (e *TwoFARequiredError) Unwrap() error { return ErrTwoFARequired }
