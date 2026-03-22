package service

import (
	"context"
	"errors"
	"log"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/email"
	"saas-starter/backend/go-api/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type PasswordService struct {
	users       repository.UserRepository
	tokens      repository.TokenRepository
	txManager   repository.TxManager
	emailSender email.Sender
	frontendURL string
}

func NewPasswordService(
	users repository.UserRepository,
	tokens repository.TokenRepository,
	txManager repository.TxManager,
	emailSender email.Sender,
	frontendURL string,
) *PasswordService {
	return &PasswordService{
		users: users, tokens: tokens, txManager: txManager,
		emailSender: emailSender, frontendURL: frontendURL,
	}
}

func (s *PasswordService) ForgotPassword(ctx context.Context, emailAddr string) error {
	user, err := s.users.FindByEmail(ctx, emailAddr)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // don't leak whether user exists
		}
		return err
	}

	s.tokens.InvalidatePasswordResetTokens(ctx, user.ID)

	tokenStr := domain.GenerateSecureToken()
	resetToken := &domain.PasswordResetToken{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: domain.TokenExpiry(15),
	}
	if err := s.tokens.CreatePasswordResetToken(ctx, resetToken); err != nil {
		return err
	}

	link := s.frontendURL + "/reset-password?token=" + tokenStr
	lang := user.PreferredLang("en")

	go func() {
		if err := s.emailSender.SendPasswordReset(user.Email, link, lang); err != nil {
			log.Printf("Failed to send reset email to %s: %v", user.Email, err)
		}
	}()

	return nil
}

func (s *PasswordService) ResetPassword(ctx context.Context, tokenStr, newPassword string) error {
	resetToken, err := s.tokens.FindPasswordResetToken(ctx, tokenStr)
	if err != nil {
		return domain.NewError(domain.ErrTokenInvalid, "invalid or expired token")
	}

	if time.Now().After(resetToken.ExpiresAt) {
		return domain.NewError(domain.ErrTokenExpired, "token expired")
	}

	if err := domain.ValidatePasswordComplexity(newPassword); err != nil {
		return domain.NewError(domain.ErrInvalidInput, err.Error())
	}

	user, err := s.users.FindByID(ctx, resetToken.UserID)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), BcryptCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)

	return s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.users.Update(txCtx, user); err != nil {
			return err
		}
		if err := s.tokens.MarkPasswordResetTokenUsed(txCtx, resetToken.ID); err != nil {
			return err
		}
		return s.tokens.RevokeAllUserRefreshTokens(txCtx, user.ID)
	})
}

func (s *PasswordService) VerifyEmail(ctx context.Context, tokenStr string) error {
	vToken, err := s.tokens.FindEmailVerificationToken(ctx, tokenStr)
	if err != nil {
		return domain.NewError(domain.ErrTokenInvalid, "invalid or expired token")
	}

	if time.Now().After(vToken.ExpiresAt) {
		return domain.NewError(domain.ErrTokenExpired, "token expired")
	}

	user, err := s.users.FindByID(ctx, vToken.UserID)
	if err != nil {
		return err
	}

	user.Verified = true

	return s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if err := s.users.Update(txCtx, user); err != nil {
			return err
		}
		return s.tokens.MarkEmailVerificationTokenUsed(txCtx, vToken.ID)
	})
}
