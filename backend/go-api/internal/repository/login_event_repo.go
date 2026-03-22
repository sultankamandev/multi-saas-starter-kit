package repository

import (
	"context"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type loginEventRepo struct {
	db *gorm.DB
}

func NewLoginEventRepository(db *gorm.DB) LoginEventRepository {
	return &loginEventRepo{db: db}
}

func (r *loginEventRepo) Create(ctx context.Context, event *domain.LoginEvent) error {
	return database.DBFromContext(ctx, r.db).Create(event).Error
}
