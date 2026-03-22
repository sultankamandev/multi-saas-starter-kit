package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/email"
	"saas-starter/backend/go-api/internal/repository"

	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type TwoFAService struct {
	users     repository.UserRepository
	twofa     repository.TwoFARepository
	txManager repository.TxManager
	tokenSvc  *TokenService
	email     email.Sender
	events    repository.LoginEventRepository
}

func NewTwoFAService(
	users repository.UserRepository,
	twofa repository.TwoFARepository,
	txManager repository.TxManager,
	tokenSvc *TokenService,
	emailSender email.Sender,
	events repository.LoginEventRepository,
) *TwoFAService {
	return &TwoFAService{
		users: users, twofa: twofa, txManager: txManager,
		tokenSvc: tokenSvc, email: emailSender, events: events,
	}
}

func (s *TwoFAService) Verify2FA(ctx context.Context, req dto.Verify2FARequest, clientIP, userAgent string) (*LoginResult, error) {
	user, err := s.users.FindByPublicID(ctx, req.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError(domain.ErrUnauthorized, "invalid 2FA request")
		}
		return nil, err
	}

	latest, err := s.twofa.FindLatestUnusedToken(ctx, user.ID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError(domain.ErrUnauthorized, "no pending 2FA code")
		}
		return nil, err
	}

	if latest.Attempts >= domain.MaxTwoFAAttempts {
		_ = s.twofa.InvalidateTokens(ctx, user.ID)
		return nil, domain.NewError(domain.ErrTooManyAttempts, "too many failed attempts, request a new code")
	}

	if time.Now().After(latest.ExpiresAt) {
		return nil, domain.NewError(domain.ErrTokenExpired, "2FA code expired")
	}

	if latest.Code != req.Code {
		_ = s.twofa.IncrementAttempts(ctx, latest.ID)
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid 2FA code")
	}

	if err := s.twofa.MarkTokenUsed(ctx, latest.ID); err != nil {
		return nil, err
	}

	pair, err := s.tokenSvc.IssueTokenPair(ctx, user.ID, user.Role, latest.RememberMe)
	if err != nil {
		return nil, err
	}

	go s.recordLogin(user.ID, clientIP, userAgent)

	return &LoginResult{User: user, TokenPair: pair}, nil
}

func (s *TwoFAService) Resend2FA(ctx context.Context, publicID string) error {
	user, err := s.users.FindByPublicID(ctx, publicID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil
		}
		return err
	}

	if user.TwoFAEnabled && user.TwoFASecret != "" {
		return domain.NewError(domain.ErrInvalidInput, "TOTP is enabled; use authenticator app")
	}

	s.twofa.InvalidateTokens(ctx, user.ID)

	code := generateSecure6DigitCode()
	token := &domain.TwoFactorToken{
		UserID:    user.ID,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := s.twofa.CreateToken(ctx, token); err != nil {
		return err
	}

	go func() {
		if err := s.email.Send2FACode(user.Email, code, user.PreferredLang("en"), user.FullName()); err != nil {
			log.Printf("Failed to send 2FA code to %s: %v", user.Email, err)
		}
	}()

	return nil
}

func (s *TwoFAService) Setup2FA(ctx context.Context, userID uint) (*dto.Setup2FAResponse, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SaaS Starter",
		AccountName: user.Email,
	})
	if err != nil {
		return nil, err
	}

	user.TwoFASecret = key.Secret()
	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}

	return &dto.Setup2FAResponse{
		OTPAuthURL: key.URL(),
		Secret:     key.Secret(),
	}, nil
}

func (s *TwoFAService) Verify2FASetup(ctx context.Context, userID uint, code string) (*dto.Verify2FASetupResponse, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.TwoFASecret == "" {
		return nil, domain.NewError(domain.ErrInvalidInput, "2FA not set up")
	}

	if !totp.Validate(code, user.TwoFASecret) {
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid 2FA code")
	}

	var recoveryCodes []string
	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		user.TwoFAEnabled = true
		if err := s.users.Update(txCtx, user); err != nil {
			return err
		}

		for i := 0; i < 10; i++ {
			b := make([]byte, 8)
			if _, err := rand.Read(b); err != nil {
				return err
			}
			plainCode := hex.EncodeToString(b)
			recoveryCodes = append(recoveryCodes, plainCode)

			hashed, err := bcrypt.GenerateFromPassword([]byte(plainCode), BcryptCost)
			if err != nil {
				return err
			}
			rc := &domain.RecoveryCode{UserID: user.ID, CodeHash: string(hashed)}
			if err := s.twofa.CreateRecoveryCode(txCtx, rc); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &dto.Verify2FASetupResponse{
		RecoveryCodes: recoveryCodes,
	}, nil
}

func (s *TwoFAService) VerifyTOTPLogin(ctx context.Context, req dto.VerifyTOTPLoginRequest, clientIP, userAgent string) (*LoginResult, error) {
	user, err := s.users.FindByPublicID(ctx, req.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError(domain.ErrUnauthorized, "invalid request")
		}
		return nil, err
	}

	if !user.TwoFAEnabled || user.TwoFASecret == "" {
		return nil, domain.NewError(domain.ErrInvalidInput, "TOTP not enabled")
	}

	if !totp.Validate(req.Code, user.TwoFASecret) {
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid 2FA code")
	}

	pair, err := s.tokenSvc.IssueTokenPair(ctx, user.ID, user.Role, req.RememberMe)
	if err != nil {
		return nil, err
	}

	go s.recordLogin(user.ID, clientIP, userAgent)

	return &LoginResult{User: user, TokenPair: pair}, nil
}

func (s *TwoFAService) UseRecoveryCode(ctx context.Context, req dto.UseRecoveryCodeRequest, clientIP, userAgent string) (*LoginResult, error) {
	user, err := s.users.FindByPublicID(ctx, req.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError(domain.ErrUnauthorized, "invalid request")
		}
		return nil, err
	}

	codes, err := s.twofa.FindUnusedRecoveryCodes(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	var matchedCode *domain.RecoveryCode
	for i := range codes {
		if bcrypt.CompareHashAndPassword([]byte(codes[i].CodeHash), []byte(req.Code)) == nil {
			matchedCode = &codes[i]
			break
		}
	}

	if matchedCode == nil {
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid recovery code")
	}

	if err := s.twofa.MarkRecoveryCodeUsed(ctx, matchedCode.ID); err != nil {
		return nil, err
	}

	pair, err := s.tokenSvc.IssueTokenPair(ctx, user.ID, user.Role, req.RememberMe)
	if err != nil {
		return nil, err
	}

	go s.recordLogin(user.ID, clientIP, userAgent)

	return &LoginResult{User: user, TokenPair: pair}, nil
}

func (s *TwoFAService) recordLogin(userID uint, ip, userAgent string) {
	event := &domain.LoginEvent{
		UserID: userID, IP: ip, UserAgent: userAgent, LoggedAt: time.Now(),
	}
	if err := s.events.Create(context.Background(), event); err != nil {
		log.Printf("Failed to record login event for user %d: %v", userID, err)
	}
}

func generateSecure6DigitCode() string {
	b := make([]byte, 3)
	rand.Read(b)
	num := (int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1000000
	return fmt.Sprintf("%06d", num)
}
