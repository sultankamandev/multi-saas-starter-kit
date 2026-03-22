package repository

import (
	"context"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type adminActionRepo struct {
	db *gorm.DB
}

func NewAdminActionRepository(db *gorm.DB) AdminActionRepository {
	return &adminActionRepo{db: db}
}

func (r *adminActionRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

func (r *adminActionRepo) Create(ctx context.Context, action *domain.AdminAction) error {
	return r.conn(ctx).Create(action).Error
}

func (r *adminActionRepo) List(ctx context.Context, page, limit int) ([]domain.AdminAction, int64, error) {
	var actions []domain.AdminAction
	var total int64

	db := r.conn(ctx)

	if err := db.Model(&domain.AdminAction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := db.Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&actions).Error; err != nil {
		return nil, 0, err
	}

	return actions, total, nil
}
