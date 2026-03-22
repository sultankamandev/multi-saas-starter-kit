package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/email"
	"saas-starter/backend/go-api/internal/repository"
	"saas-starter/backend/go-api/pkg/i18n"

	"golang.org/x/crypto/bcrypt"
)

type AdminUserService struct {
	users    repository.UserRepository
	auditLog repository.AdminActionRepository
	txManager repository.TxManager
	email    email.Sender
}

func NewAdminUserService(
	users repository.UserRepository,
	auditLog repository.AdminActionRepository,
	txManager repository.TxManager,
	emailSender email.Sender,
) *AdminUserService {
	return &AdminUserService{
		users: users, auditLog: auditLog, txManager: txManager, email: emailSender,
	}
}

func (s *AdminUserService) List(ctx context.Context, params dto.UserListParams) ([]domain.User, int64, error) {
	return s.users.List(ctx, params)
}

func (s *AdminUserService) GetByID(ctx context.Context, id uint) (*domain.User, error) {
	return s.users.FindByID(ctx, id)
}

func (s *AdminUserService) Create(ctx context.Context, adminID uint, req dto.AdminCreateUserRequest) (*domain.User, error) {
	existing, err := s.users.FindByEmail(ctx, req.Email)
	if err == nil && existing != nil {
		return nil, domain.NewError(domain.ErrConflict, "user already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), BcryptCost)
	if err != nil {
		return nil, err
	}

	role := req.Role
	if role == "" {
		role = "user"
	}
	validRoles := map[string]bool{"user": true, "admin": true}
	if !validRoles[role] {
		return nil, domain.NewError(domain.ErrInvalidInput, "invalid role")
	}

	lang := normalizeLang(req.Language)

	user := &domain.User{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         role,
		Language:     lang,
	}
	if req.Verified != nil {
		user.Verified = *req.Verified
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	s.logAction(ctx, adminID, "create", user, fmt.Sprintf("Created user: %s (%s)", user.FullName(), user.Email))

	return user, nil
}

func (s *AdminUserService) Update(ctx context.Context, adminID, userID uint, req dto.AdminUpdateUserRequest) (*domain.User, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	oldRole := user.Role
	roleChanged := false

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), BcryptCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hash)
	}
	if req.Role != "" {
		validRoles := map[string]bool{"user": true, "admin": true}
		if !validRoles[req.Role] {
			return nil, domain.NewError(domain.ErrInvalidInput, "invalid role")
		}
		if user.Role != req.Role {
			roleChanged = true
			user.Role = req.Role
		}
	}
	if req.Language != "" {
		lang := req.Language
		if len(lang) > 2 {
			lang = lang[:2]
		}
		lang = strings.ToLower(lang)
		if i18n.IsLanguageSupported(lang) {
			user.Language = lang
		}
	}
	if req.Country != "" {
		c := strings.ToUpper(req.Country)
		if len(c) > 10 {
			c = c[:10]
		}
		user.Country = c
	} else {
		user.Country = ""
	}

	user.Address = req.Address
	user.Phone = req.Phone

	if req.Verified != nil {
		user.Verified = *req.Verified
	}
	if req.TwoFAEnabled != nil {
		user.TwoFAEnabled = *req.TwoFAEnabled
		if !*req.TwoFAEnabled && user.TwoFASecret != "" {
			user.TwoFASecret = ""
		}
	}

	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}

	s.logAction(ctx, adminID, "update", user, fmt.Sprintf("Updated user: %s (%s)", user.FullName(), user.Email))

	if roleChanged {
		s.logAction(ctx, adminID, "role_change", user, fmt.Sprintf("Changed role from '%s' to '%s' for %s", oldRole, user.Role, user.Email))
		go func() {
			if err := s.email.SendRoleChange(user.Email, user.PreferredLang("en"), user.FullName(), oldRole, user.Role); err != nil {
				log.Printf("Failed to send role change notification to %s: %v", user.Email, err)
			}
		}()
	}

	return user, nil
}

func (s *AdminUserService) Delete(ctx context.Context, adminID, userID uint) error {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		s.logAction(txCtx, adminID, "delete", user, fmt.Sprintf("Deleted user: %s (%s)", user.FullName(), user.Email))
		return s.users.SoftDelete(txCtx, userID)
	})
	if err != nil {
		return err
	}

	go func() {
		if sendErr := s.email.SendAccountDeleted(user.Email, user.PreferredLang("en"), user.FullName(), user.Email); sendErr != nil {
			log.Printf("Failed to send deletion notification to %s: %v", user.Email, sendErr)
		}
	}()

	return nil
}

func (s *AdminUserService) UpdateRole(ctx context.Context, adminID, userID uint, role string) (*domain.User, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	oldRole := user.Role
	user.Role = role

	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}

	s.logAction(ctx, adminID, "role_change", user, fmt.Sprintf("Changed role from '%s' to '%s' for %s", oldRole, role, user.Email))

	go func() {
		if err := s.email.SendRoleChange(user.Email, user.PreferredLang("en"), user.FullName(), oldRole, role); err != nil {
			log.Printf("Failed to send role change notification to %s: %v", user.Email, err)
		}
	}()

	return user, nil
}

func (s *AdminUserService) Stats(ctx context.Context) (map[string]int64, error) {
	total, _ := s.users.Count(ctx)
	admins, _ := s.users.CountByRole(ctx, "admin")
	regular, _ := s.users.CountByRole(ctx, "user")

	return map[string]int64{
		"total_users":   total,
		"admin_users":   admins,
		"regular_users": regular,
	}, nil
}

func (s *AdminUserService) GetActions(ctx context.Context, page, limit int) ([]domain.AdminAction, int64, error) {
	return s.auditLog.List(ctx, page, limit)
}

func (s *AdminUserService) logAction(ctx context.Context, adminID uint, action string, target *domain.User, message string) {
	admin, _ := s.users.FindByID(ctx, adminID)
	adminEmail := "unknown"
	if admin != nil && admin.Email != "" {
		adminEmail = admin.Email
	}

	entry := &domain.AdminAction{
		AdminID:      adminID,
		AdminEmail:   adminEmail,
		Action:       action,
		TargetUserID: target.ID,
		TargetEmail:  target.Email,
		Message:      message,
	}
	if err := s.auditLog.Create(ctx, entry); err != nil {
		log.Printf("Failed to log admin action: %v", err)
	}
}
