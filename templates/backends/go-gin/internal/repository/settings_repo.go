package repository

import (
	"context"
	"errors"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type settingsRepo struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) SettingsRepository {
	return &settingsRepo{db: db}
}

func (r *settingsRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

func (r *settingsRepo) Get(ctx context.Context, key string, defaultValue string) string {
	var setting domain.AppSettings
	if err := r.conn(ctx).Where("key = ?", key).First(&setting).Error; err != nil {
		return defaultValue
	}
	return setting.Value
}

func (r *settingsRepo) Set(ctx context.Context, key, value string) error {
	var setting domain.AppSettings
	result := r.conn(ctx).Where("key = ?", key).First(&setting)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		setting = domain.AppSettings{Key: key, Value: value}
		return r.conn(ctx).Create(&setting).Error
	} else if result.Error != nil {
		return result.Error
	}

	setting.Value = value
	return r.conn(ctx).Save(&setting).Error
}

func (r *settingsRepo) GetAll(ctx context.Context) ([]domain.AppSettings, error) {
	var settings []domain.AppSettings
	if err := r.conn(ctx).Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}
