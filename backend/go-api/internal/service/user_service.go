package service

import (
	"context"
	"log"
	"strings"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/repository"
	"saas-starter/backend/go-api/pkg/i18n"
)

type UserService struct {
	users repository.UserRepository
}

func NewUserService(users repository.UserRepository) *UserService {
	return &UserService{users: users}
}

func (s *UserService) GetProfile(ctx context.Context, userID uint) (*domain.User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *UserService) UpdateProfile(ctx context.Context, userID uint, req dto.UpdateProfileRequest) (*domain.User, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.Username != "" {
		normalized := domain.NormalizeUsername(req.Username)
		if err := domain.ValidateUsername(normalized); err != nil {
			return nil, domain.NewError(domain.ErrInvalidInput, err.Error())
		}
		available, err := s.users.IsUsernameAvailable(ctx, normalized, user.ID)
		if err != nil {
			return nil, err
		}
		if !available {
			return nil, domain.NewError(domain.ErrConflict, "username already taken")
		}
		user.Username = normalized
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Language != "" {
		langCode := req.Language
		if len(langCode) > 2 {
			langCode = langCode[:2]
		}
		if i18n.IsLanguageSupported(langCode) {
			user.Language = langCode
		}
	}
	if req.Country != "" {
		country := strings.ToUpper(req.Country)
		if len(country) > 10 {
			country = country[:10]
		}
		user.Country = country
	}
	if req.Address != "" {
		user.Address = req.Address
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}

	if req.TwoFAEnabled != nil {
		user.TwoFAEnabled = *req.TwoFAEnabled
		if !*req.TwoFAEnabled && user.TwoFASecret != "" {
			user.TwoFASecret = ""
			log.Printf("Cleared TOTP secret for user %d (2FA disabled)", user.ID)
		}
	}

	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
