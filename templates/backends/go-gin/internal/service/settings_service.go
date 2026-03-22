package service

import (
	"context"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/repository"
)

type SettingsService struct {
	settings repository.SettingsRepository
}

func NewSettingsService(settings repository.SettingsRepository) *SettingsService {
	return &SettingsService{settings: settings}
}

func (s *SettingsService) GetAll(ctx context.Context) ([]domain.AppSettings, error) {
	return s.settings.GetAll(ctx)
}

func (s *SettingsService) Get(ctx context.Context, key string) string {
	return s.settings.Get(ctx, key, "")
}

func (s *SettingsService) Set(ctx context.Context, key, value string) error {
	return s.settings.Set(ctx, key, value)
}
