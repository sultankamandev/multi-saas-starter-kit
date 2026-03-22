package service

import (
	"context"
	"time"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/repository"
)

type AnalyticsService struct {
	analytics repository.AnalyticsRepository
}

func NewAnalyticsService(analytics repository.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{analytics: analytics}
}

func (s *AnalyticsService) UserRegistrations(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.UserAnalytics, error) {
	return s.analytics.UserRegistrationsByDay(ctx, filter)
}

func (s *AnalyticsService) ActiveUsers(ctx context.Context, filter dto.AnalyticsFilter) (*dto.ActiveUserAnalyticsResponse, error) {
	daily, err := s.analytics.ActiveUsersByDay(ctx, filter)
	if err != nil {
		return nil, err
	}

	active24h, _ := s.analytics.ActiveUsersCount(ctx, time.Now().Add(-24*time.Hour), filter)
	active7d, _ := s.analytics.ActiveUsersCount(ctx, time.Now().AddDate(0, 0, -7), filter)

	return &dto.ActiveUserAnalyticsResponse{
		Daily:     daily,
		Active24h: active24h,
		Active7d:  active7d,
	}, nil
}

func (s *AnalyticsService) Retention(ctx context.Context, filter dto.AnalyticsFilter) (*dto.RetentionAnalyticsResponse, error) {
	data, err := s.analytics.RetentionByDay(ctx, filter)
	if err != nil {
		return nil, err
	}

	var avg7, avg30 float64
	count := 0
	for _, r := range data {
		if r.NewUsers > 0 {
			avg7 += r.Retention7Rate
			avg30 += r.Retention30Rate
			count++
		}
	}
	if count > 0 {
		avg7 /= float64(count)
		avg30 /= float64(count)
	}

	return &dto.RetentionAnalyticsResponse{
		RetentionData: data,
		Average7d:     avg7,
		Average30d:    avg30,
	}, nil
}

func (s *AnalyticsService) CohortRetention(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.CohortRow, error) {
	return s.analytics.CohortRetention(ctx, filter)
}

func (s *AnalyticsService) Summary(ctx context.Context, filter dto.AnalyticsFilter) (*dto.AdminSummary, error) {
	return s.analytics.SummaryStats(ctx, filter)
}
