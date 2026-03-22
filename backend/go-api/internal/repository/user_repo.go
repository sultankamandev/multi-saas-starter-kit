package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

func (r *userRepo) FindByID(ctx context.Context, id uint) (*domain.User, error) {
	var user domain.User
	if err := r.conn(ctx).First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByPublicID(ctx context.Context, publicID string) (*domain.User, error) {
	var user domain.User
	if err := r.conn(ctx).Where("public_id = ?", publicID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	if err := r.conn(ctx).Where("LOWER(email) = LOWER(?)", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByEmailUnscoped(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	if err := r.conn(ctx).Unscoped().Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user domain.User
	if err := r.conn(ctx).Where("LOWER(username) = LOWER(?)", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	return r.conn(ctx).Create(user).Error
}

func (r *userRepo) Update(ctx context.Context, user *domain.User) error {
	return r.conn(ctx).Save(user).Error
}

func (r *userRepo) SoftDelete(ctx context.Context, id uint) error {
	return r.conn(ctx).Delete(&domain.User{}, id).Error
}

func (r *userRepo) HardDelete(ctx context.Context, id uint) error {
	return r.conn(ctx).Unscoped().Delete(&domain.User{}, id).Error
}

func (r *userRepo) HardDeleteRelatedRecords(ctx context.Context, userID uint) error {
	db := r.conn(ctx)
	tables := []interface{}{
		&domain.EmailVerificationToken{},
		&domain.TwoFactorToken{},
		&domain.RefreshToken{},
		&domain.RecoveryCode{},
		&domain.PasswordResetToken{},
		&domain.LoginEvent{},
	}
	for _, model := range tables {
		if err := db.Where("user_id = ?", userID).Delete(model).Error; err != nil {
			return fmt.Errorf("failed to delete %T for user %d: %w", model, userID, err)
		}
	}
	return nil
}

func (r *userRepo) IsUsernameAvailable(ctx context.Context, username string, excludeID ...uint) (bool, error) {
	query := r.conn(ctx).Where("LOWER(username) = LOWER(?)", username)
	if len(excludeID) > 0 && excludeID[0] > 0 {
		query = query.Where("id != ?", excludeID[0])
	}
	var user domain.User
	if err := query.First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}
		return false, err
	}
	return false, nil
}

var allowedSortColumns = map[string]string{
	"id": "id", "first_name": "first_name", "last_name": "last_name",
	"email": "email", "role": "role", "language": "language",
	"created_at": "created_at", "updated_at": "updated_at",
}

func (r *userRepo) List(ctx context.Context, params dto.UserListParams) ([]domain.User, int64, error) {
	var users []domain.User
	var total int64

	query := r.conn(ctx).Model(&domain.User{})

	if params.SearchQuery != "" {
		pattern := "%" + params.SearchQuery + "%"
		query = query.Where(
			"first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR (first_name || ' ' || last_name) ILIKE ?",
			pattern, pattern, pattern, pattern,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := "id"
	if col, ok := allowedSortColumns[params.SortField]; ok {
		sortCol = col
	}
	sortDir := "ASC"
	if params.SortOrder == "desc" || params.SortOrder == "DESC" {
		sortDir = "DESC"
	}
	offset := (params.Page - 1) * params.Limit

	if err := query.Order(sortCol + " " + sortDir).
		Limit(params.Limit).Offset(offset).
		Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepo) CountByRole(ctx context.Context, role string) (int64, error) {
	var count int64
	err := r.conn(ctx).Model(&domain.User{}).Where("role = ?", role).Count(&count).Error
	return count, err
}

func (r *userRepo) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.conn(ctx).Model(&domain.User{}).Count(&count).Error
	return count, err
}

func (r *userRepo) CountVerified(ctx context.Context) (int64, error) {
	var count int64
	err := r.conn(ctx).Model(&domain.User{}).Where("verified = ?", true).Count(&count).Error
	return count, err
}

func (r *userRepo) CountSince(ctx context.Context, since time.Time) (int64, error) {
	var count int64
	err := r.conn(ctx).Model(&domain.User{}).Where("created_at >= ?", since).Count(&count).Error
	return count, err
}
