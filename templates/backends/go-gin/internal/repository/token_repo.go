package repository

import (
	"context"
	"errors"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type tokenRepo struct {
	db *gorm.DB
}

func NewTokenRepository(db *gorm.DB) TokenRepository {
	return &tokenRepo{db: db}
}

func (r *tokenRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

// --- Refresh Token (stored as SHA-256 hash) ---

func (r *tokenRepo) CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error {
	return r.conn(ctx).Create(token).Error
}

func (r *tokenRepo) FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	var token domain.RefreshToken
	if err := r.conn(ctx).Where("token_hash = ?", tokenHash).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *tokenRepo) RevokeRefreshTokenByHash(ctx context.Context, tokenHash string) error {
	return r.conn(ctx).Model(&domain.RefreshToken{}).
		Where("token_hash = ?", tokenHash).
		Update("revoked", true).Error
}

func (r *tokenRepo) RevokeTokenFamily(ctx context.Context, familyID string) error {
	return r.conn(ctx).Model(&domain.RefreshToken{}).
		Where("family_id = ? AND revoked = ?", familyID, false).
		Update("revoked", true).Error
}

func (r *tokenRepo) RevokeAllUserRefreshTokens(ctx context.Context, userID uint) error {
	return r.conn(ctx).Model(&domain.RefreshToken{}).
		Where("user_id = ? AND revoked = ?", userID, false).
		Update("revoked", true).Error
}

// --- Password Reset Token ---

func (r *tokenRepo) CreatePasswordResetToken(ctx context.Context, token *domain.PasswordResetToken) error {
	return r.conn(ctx).Create(token).Error
}

func (r *tokenRepo) FindPasswordResetToken(ctx context.Context, tokenStr string) (*domain.PasswordResetToken, error) {
	var token domain.PasswordResetToken
	if err := r.conn(ctx).Where("token = ? AND used = ?", tokenStr, false).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *tokenRepo) InvalidatePasswordResetTokens(ctx context.Context, userID uint) error {
	return r.conn(ctx).Model(&domain.PasswordResetToken{}).
		Where("user_id = ? AND used = ?", userID, false).
		Update("used", true).Error
}

func (r *tokenRepo) MarkPasswordResetTokenUsed(ctx context.Context, id uint) error {
	return r.conn(ctx).Model(&domain.PasswordResetToken{}).
		Where("id = ?", id).
		Update("used", true).Error
}

// --- Email Verification Token ---

func (r *tokenRepo) CreateEmailVerificationToken(ctx context.Context, token *domain.EmailVerificationToken) error {
	return r.conn(ctx).Create(token).Error
}

func (r *tokenRepo) FindEmailVerificationToken(ctx context.Context, tokenStr string) (*domain.EmailVerificationToken, error) {
	var token domain.EmailVerificationToken
	if err := r.conn(ctx).Where("token = ? AND used = ?", tokenStr, false).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *tokenRepo) MarkEmailVerificationTokenUsed(ctx context.Context, id uint) error {
	return r.conn(ctx).Model(&domain.EmailVerificationToken{}).
		Where("id = ?", id).
		Update("used", true).Error
}
