package repository

import (
	"context"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
)

type TxManager interface {
	WithTx(ctx context.Context, fn func(ctx context.Context) error) error
}

type UserRepository interface {
	FindByID(ctx context.Context, id uint) (*domain.User, error)
	FindByPublicID(ctx context.Context, publicID string) (*domain.User, error)
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByEmailUnscoped(ctx context.Context, email string) (*domain.User, error)
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
	Update(ctx context.Context, user *domain.User) error
	SoftDelete(ctx context.Context, id uint) error
	HardDelete(ctx context.Context, id uint) error
	HardDeleteRelatedRecords(ctx context.Context, userID uint) error
	IsUsernameAvailable(ctx context.Context, username string, excludeID ...uint) (bool, error)
	List(ctx context.Context, params dto.UserListParams) ([]domain.User, int64, error)
	CountByRole(ctx context.Context, role string) (int64, error)
	Count(ctx context.Context) (int64, error)
	CountVerified(ctx context.Context) (int64, error)
	CountSince(ctx context.Context, since time.Time) (int64, error)
}

type TokenRepository interface {
	CreateRefreshToken(ctx context.Context, token *domain.RefreshToken) error
	FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error)
	RevokeRefreshTokenByHash(ctx context.Context, tokenHash string) error
	RevokeTokenFamily(ctx context.Context, familyID string) error
	RevokeAllUserRefreshTokens(ctx context.Context, userID uint) error

	CreatePasswordResetToken(ctx context.Context, token *domain.PasswordResetToken) error
	FindPasswordResetToken(ctx context.Context, tokenStr string) (*domain.PasswordResetToken, error)
	InvalidatePasswordResetTokens(ctx context.Context, userID uint) error
	MarkPasswordResetTokenUsed(ctx context.Context, id uint) error

	CreateEmailVerificationToken(ctx context.Context, token *domain.EmailVerificationToken) error
	FindEmailVerificationToken(ctx context.Context, tokenStr string) (*domain.EmailVerificationToken, error)
	MarkEmailVerificationTokenUsed(ctx context.Context, id uint) error
}

type TwoFARepository interface {
	CreateToken(ctx context.Context, token *domain.TwoFactorToken) error
	FindValidToken(ctx context.Context, userID uint, code string) (*domain.TwoFactorToken, error)
	FindLatestUnusedToken(ctx context.Context, userID uint) (*domain.TwoFactorToken, error)
	IncrementAttempts(ctx context.Context, tokenID uint) error
	InvalidateTokens(ctx context.Context, userID uint) error
	MarkTokenUsed(ctx context.Context, id uint) error

	CreateRecoveryCode(ctx context.Context, code *domain.RecoveryCode) error
	FindUnusedRecoveryCodes(ctx context.Context, userID uint) ([]domain.RecoveryCode, error)
	MarkRecoveryCodeUsed(ctx context.Context, id uint) error
}

type LoginEventRepository interface {
	Create(ctx context.Context, event *domain.LoginEvent) error
}

type AdminActionRepository interface {
	Create(ctx context.Context, action *domain.AdminAction) error
	List(ctx context.Context, page, limit int) ([]domain.AdminAction, int64, error)
}

type SettingsRepository interface {
	Get(ctx context.Context, key string, defaultValue string) string
	Set(ctx context.Context, key string, value string) error
	GetAll(ctx context.Context) ([]domain.AppSettings, error)
}

type AnalyticsRepository interface {
	UserRegistrationsByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.UserAnalytics, error)
	ActiveUsersByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.ActiveUserStats, error)
	ActiveUsersCount(ctx context.Context, since time.Time, filter dto.AnalyticsFilter) (int64, error)
	RetentionByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.RetentionStats, error)
	CohortRetention(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.CohortRow, error)
	SummaryStats(ctx context.Context, filter dto.AnalyticsFilter) (*dto.AdminSummary, error)
}
