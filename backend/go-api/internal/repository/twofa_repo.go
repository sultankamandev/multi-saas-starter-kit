package repository

import (
	"context"
	"errors"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type twofaRepo struct {
	db *gorm.DB
}

func NewTwoFARepository(db *gorm.DB) TwoFARepository {
	return &twofaRepo{db: db}
}

func (r *twofaRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

func (r *twofaRepo) CreateToken(ctx context.Context, token *domain.TwoFactorToken) error {
	return r.conn(ctx).Create(token).Error
}

func (r *twofaRepo) FindValidToken(ctx context.Context, userID uint, code string) (*domain.TwoFactorToken, error) {
	var token domain.TwoFactorToken
	if err := r.conn(ctx).Where("user_id = ? AND code = ? AND used = ?", userID, code, false).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *twofaRepo) InvalidateTokens(ctx context.Context, userID uint) error {
	return r.conn(ctx).Model(&domain.TwoFactorToken{}).
		Where("user_id = ? AND used = ?", userID, false).
		Update("used", true).Error
}

func (r *twofaRepo) FindLatestUnusedToken(ctx context.Context, userID uint) (*domain.TwoFactorToken, error) {
	var token domain.TwoFactorToken
	if err := r.conn(ctx).Where("user_id = ? AND used = ?", userID, false).
		Order("created_at DESC").First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *twofaRepo) IncrementAttempts(ctx context.Context, tokenID uint) error {
	return r.conn(ctx).Model(&domain.TwoFactorToken{}).
		Where("id = ?", tokenID).
		Update("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *twofaRepo) MarkTokenUsed(ctx context.Context, id uint) error {
	return r.conn(ctx).Model(&domain.TwoFactorToken{}).
		Where("id = ?", id).
		Update("used", true).Error
}

func (r *twofaRepo) CreateRecoveryCode(ctx context.Context, code *domain.RecoveryCode) error {
	return r.conn(ctx).Create(code).Error
}

func (r *twofaRepo) FindUnusedRecoveryCodes(ctx context.Context, userID uint) ([]domain.RecoveryCode, error) {
	var codes []domain.RecoveryCode
	if err := r.conn(ctx).Where("user_id = ? AND used = ?", userID, false).Find(&codes).Error; err != nil {
		return nil, err
	}
	return codes, nil
}

func (r *twofaRepo) MarkRecoveryCodeUsed(ctx context.Context, id uint) error {
	return r.conn(ctx).Model(&domain.RecoveryCode{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{"used": true, "used_at": gorm.Expr("NOW()")}).Error
}
