package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"strings"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/geoip"
	"saas-starter/backend/go-api/internal/repository"
	"saas-starter/backend/go-api/pkg/i18n"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type OAuthService struct {
	users       repository.UserRepository
	loginEvents repository.LoginEventRepository
	tokenSvc    *TokenService
	geoIP       geoip.Resolver
	googleClientID string
}

func NewOAuthService(
	users repository.UserRepository,
	loginEvents repository.LoginEventRepository,
	tokenSvc *TokenService,
	geoIPResolver geoip.Resolver,
	googleClientID string,
) *OAuthService {
	return &OAuthService{
		users: users, loginEvents: loginEvents,
		tokenSvc: tokenSvc, geoIP: geoIPResolver,
		googleClientID: googleClientID,
	}
}

type GoogleLoginResult struct {
	User       *domain.User
	TokenPair  *dto.TokenPair
	Requires2FA bool
	TwoFAType  string
}

func (s *OAuthService) GoogleLogin(ctx context.Context, googleToken string, rememberMe bool, clientIP, userAgent string) (*GoogleLoginResult, error) {
	if s.googleClientID == "" {
		return nil, domain.NewError(domain.ErrInvalidInput, "Google OAuth not configured")
	}

	payload, err := idtoken.Validate(ctx, googleToken, s.googleClientID)
	if err != nil {
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid Google token")
	}

	email, ok := payload.Claims["email"].(string)
	if !ok || email == "" {
		return nil, domain.NewError(domain.ErrInvalidInput, "Google email not found")
	}

	firstName, lastName := extractGoogleName(payload.Claims)

	user, err := s.users.FindByEmail(ctx, email)
	if errors.Is(err, domain.ErrNotFound) {
		user, err = s.createGoogleUser(ctx, email, firstName, lastName, payload.Claims, clientIP)
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		s.updateExistingGoogleUser(ctx, user, firstName, lastName)
	}

	if user.TwoFAEnabled && user.TwoFASecret != "" {
		return &GoogleLoginResult{
			User:        user,
			Requires2FA: true,
			TwoFAType:   "totp",
		}, nil
	}

	pair, err := s.tokenSvc.IssueTokenPair(ctx, user.ID, user.Role, rememberMe)
	if err != nil {
		return nil, err
	}

	go s.recordLogin(user.ID, clientIP, userAgent)

	return &GoogleLoginResult{User: user, TokenPair: pair}, nil
}

func (s *OAuthService) createGoogleUser(ctx context.Context, email, firstName, lastName string, claims map[string]interface{}, clientIP string) (*domain.User, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(hex.EncodeToString(randomBytes)), BcryptCost)
	if err != nil {
		return nil, err
	}

	userLang := "en"
	if locale, ok := claims["locale"].(string); ok && locale != "" {
		parts := strings.Split(locale, "_")
		if len(parts) > 0 {
			code := strings.ToLower(parts[0])
			if i18n.IsLanguageSupported(code) {
				userLang = code
			}
		}
	}

	country := s.geoIP.CountryFromIP(clientIP)

	user := &domain.User{
		FirstName:    firstName,
		LastName:     lastName,
		Email:        email,
		PasswordHash: string(hash),
		Role:         "user",
		Verified:     true,
		Language:     userLang,
		Country:      country,
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *OAuthService) updateExistingGoogleUser(ctx context.Context, user *domain.User, firstName, lastName string) {
	updated := false
	if user.FirstName == "" && firstName != "" {
		user.FirstName = firstName
		updated = true
	}
	if user.LastName == "" && lastName != "" {
		user.LastName = lastName
		updated = true
	}
	if !user.Verified {
		user.Verified = true
		updated = true
	}
	if updated {
		_ = s.users.Update(ctx, user)
	}
}

func (s *OAuthService) recordLogin(userID uint, ip, userAgent string) {
	event := &domain.LoginEvent{
		UserID: userID, IP: ip, UserAgent: userAgent, LoggedAt: time.Now(),
	}
	if err := s.loginEvents.Create(context.Background(), event); err != nil {
		log.Printf("Failed to record login event for user %d: %v", userID, err)
	}
}

func extractGoogleName(claims map[string]interface{}) (string, string) {
	firstName, lastName := "", ""

	if name, ok := claims["name"].(string); ok && name != "" {
		parts := strings.Fields(name)
		if len(parts) > 0 {
			firstName = parts[0]
		}
		if len(parts) > 1 {
			lastName = strings.Join(parts[1:], " ")
		}
	} else {
		if given, ok := claims["given_name"].(string); ok {
			firstName = given
		}
		if family, ok := claims["family_name"].(string); ok {
			lastName = family
		}
	}

	return firstName, lastName
}
