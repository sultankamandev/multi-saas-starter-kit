package service

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/captcha"
	"saas-starter/backend/go-api/internal/platform/email"
	"saas-starter/backend/go-api/internal/platform/geoip"
	"saas-starter/backend/go-api/internal/repository"
	"saas-starter/backend/go-api/pkg/i18n"

	"golang.org/x/crypto/bcrypt"
)

type RegisterResult struct {
	User                 *domain.User
	VerificationRequired bool
}

type LoginResult struct {
	User      *domain.User
	TokenPair *dto.TokenPair
}

type AuthService struct {
	users       repository.UserRepository
	tokens      repository.TokenRepository
	loginEvents repository.LoginEventRepository
	settings    repository.SettingsRepository
	txManager   repository.TxManager
	tokenSvc    *TokenService
	emailSender email.Sender
	captcha     captcha.Verifier
	geoIP       geoip.Resolver
	frontendURL string
}

func NewAuthService(
	users repository.UserRepository,
	tokens repository.TokenRepository,
	loginEvents repository.LoginEventRepository,
	settings repository.SettingsRepository,
	txManager repository.TxManager,
	tokenSvc *TokenService,
	emailSender email.Sender,
	captchaVerifier captcha.Verifier,
	geoIPResolver geoip.Resolver,
	frontendURL string,
) *AuthService {
	return &AuthService{
		users:       users,
		tokens:      tokens,
		loginEvents: loginEvents,
		settings:    settings,
		txManager:   txManager,
		tokenSvc:    tokenSvc,
		emailSender: emailSender,
		captcha:     captchaVerifier,
		geoIP:       geoIPResolver,
		frontendURL: frontendURL,
	}
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest, clientIP string) (*RegisterResult, error) {
	if req.RecaptchaToken != "" {
		if err := s.captcha.Verify(req.RecaptchaToken, "register"); err != nil {
			return nil, domain.NewError(domain.ErrInvalidInput, "reCAPTCHA verification failed")
		}
	}

	username := domain.NormalizeUsername(req.Username)
	if err := domain.ValidateUsername(username); err != nil {
		return nil, domain.NewError(domain.ErrInvalidInput, err.Error())
	}

	available, err := s.users.IsUsernameAvailable(ctx, username)
	if err != nil {
		return nil, err
	}
	if !available {
		return nil, domain.NewError(domain.ErrConflict, "username already taken")
	}

	existing, err := s.users.FindByEmailUnscoped(ctx, req.Email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	if existing != nil && !existing.DeletedAt.Valid {
		return nil, domain.NewError(domain.ErrConflict, "user already exists")
	}

	if err := domain.ValidatePasswordComplexity(req.Password); err != nil {
		return nil, domain.NewError(domain.ErrInvalidInput, err.Error())
	}

	lang := normalizeLang(req.Language)
	country := s.resolveCountry(req.Country, clientIP, lang)

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), BcryptCost)
	if err != nil {
		return nil, err
	}

	requireVerification := s.isVerificationRequired(ctx)
	require2FA := s.is2FARequired(ctx)

	user := &domain.User{
		Username:     username,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         "user",
		Language:     lang,
		Country:      country,
		Verified:     !requireVerification,
		TwoFAEnabled: require2FA,
	}

	var verificationTokenStr string

	err = s.txManager.WithTx(ctx, func(txCtx context.Context) error {
		if existing != nil && existing.DeletedAt.Valid {
			if err := s.users.HardDeleteRelatedRecords(txCtx, existing.ID); err != nil {
				return err
			}
			if err := s.users.HardDelete(txCtx, existing.ID); err != nil {
				return err
			}
		}

		if err := s.users.Create(txCtx, user); err != nil {
			return err
		}

		if requireVerification {
			verificationTokenStr = domain.GenerateSecureToken()
			vToken := &domain.EmailVerificationToken{
				UserID:    user.ID,
				Token:     verificationTokenStr,
				ExpiresAt: domain.TokenExpiry(15),
			}
			return s.tokens.CreateEmailVerificationToken(txCtx, vToken)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	if requireVerification && verificationTokenStr != "" {
		go func() {
			link := s.frontendURL + "/verify-email?token=" + verificationTokenStr
			if sendErr := s.emailSender.SendVerification(user.Email, link, lang, user.FullName()); sendErr != nil {
				log.Printf("Failed to send verification email to %s: %v", user.Email, sendErr)
			}
		}()
	}

	return &RegisterResult{User: user, VerificationRequired: requireVerification}, nil
}

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest, clientIP, userAgent string) (*LoginResult, error) {
	if req.RecaptchaToken != "" {
		if err := s.captcha.Verify(req.RecaptchaToken, "login"); err != nil {
			return nil, domain.NewError(domain.ErrInvalidInput, "reCAPTCHA verification failed")
		}
	}

	input := strings.TrimSpace(req.EmailOrUsername)
	normalized := strings.ToLower(input)

	var user *domain.User
	var err error
	if strings.Contains(normalized, "@") {
		user, err = s.users.FindByEmail(ctx, normalized)
	} else {
		user, err = s.users.FindByUsername(ctx, normalized)
	}
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.NewError(domain.ErrUnauthorized, "invalid credentials")
		}
		return nil, err
	}

	if bcryptErr := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); bcryptErr != nil {
		return nil, domain.NewError(domain.ErrUnauthorized, "invalid credentials")
	}

	if s.isVerificationRequired(ctx) && !user.Verified {
		return nil, domain.NewError(domain.ErrEmailNotVerified, "email not verified")
	}

	if user.TwoFAEnabled {
		twoFAType := "email"
		if user.TwoFASecret != "" {
			twoFAType = "totp"
		}

		if twoFAType == "email" {
			s.send2FACode(ctx, user, req.RememberMe)
		}

		return nil, &domain.TwoFARequiredError{
			PublicID:  user.PublicID,
			TwoFAType: twoFAType,
			Message:   "2FA required",
		}
	}

	pair, err := s.tokenSvc.IssueTokenPair(ctx, user.ID, user.Role, req.RememberMe)
	if err != nil {
		return nil, err
	}

	go s.recordLoginEvent(ctx, user.ID, clientIP, userAgent)

	return &LoginResult{User: user, TokenPair: pair}, nil
}

func (s *AuthService) GetMe(ctx context.Context, userID uint) (*domain.User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *AuthService) RefreshToken(ctx context.Context, rawRefreshToken string) (*dto.RefreshTokenResponse, error) {
	result, err := s.tokenSvc.ValidateAndRevokeRefreshToken(ctx, rawRefreshToken)
	if err != nil {
		return nil, err
	}

	user, err := s.users.FindByID(ctx, result.UserID)
	if err != nil {
		return nil, err
	}

	pair, err := s.tokenSvc.IssueRotatedPair(ctx, user.ID, user.Role, result.FamilyID)
	if err != nil {
		return nil, err
	}

	return &dto.RefreshTokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresIn:    pair.ExpiresIn,
		TokenType:    pair.TokenType,
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	return s.tokenSvc.RevokeRefreshToken(ctx, rawRefreshToken)
}

func (s *AuthService) LogoutAllSessions(ctx context.Context, userID uint) error {
	return s.tokenSvc.RevokeAllUserTokens(ctx, userID)
}

// send2FACode is a placeholder — the actual 2FA code sending
// is handled by TwoFAService. The auth service only detects that
// 2FA is required and returns TwoFARequiredError to the handler,
// which then delegates to the twofa handler/service flow.
func (s *AuthService) send2FACode(_ context.Context, _ *domain.User, _ bool) {
	// Intentionally empty: 2FA email sending is handled by TwoFAService.Resend2FA
	// which the frontend calls after receiving requires_2fa=true.
}

func (s *AuthService) recordLoginEvent(ctx context.Context, userID uint, ip, userAgent string) {
	event := &domain.LoginEvent{
		UserID:    userID,
		IP:        ip,
		UserAgent: userAgent,
		LoggedAt:  time.Now(),
	}
	if err := s.loginEvents.Create(context.Background(), event); err != nil {
		log.Printf("Failed to record login event for user %d: %v", userID, err)
	}
}

func (s *AuthService) isVerificationRequired(ctx context.Context) bool {
	val := s.settings.Get(ctx, "require_email_verification", "true")
	return val == "true"
}

func (s *AuthService) is2FARequired(ctx context.Context) bool {
	val := s.settings.Get(ctx, "require_2fa", "false")
	return val == "true"
}

func (s *AuthService) resolveCountry(country, clientIP, lang string) string {
	if country != "" {
		c := strings.ToUpper(country)
		if len(c) > 10 {
			c = c[:10]
		}
		return c
	}
	if detected := s.geoIP.CountryFromIP(clientIP); detected != "" {
		return detected
	}
	return s.geoIP.CountryFromLanguage(lang)
}

func normalizeLang(lang string) string {
	if lang == "" {
		return "en"
	}
	lang = strings.ToLower(lang)
	if len(lang) > 2 {
		lang = lang[:2]
	}
	if !i18n.IsLanguageSupported(lang) {
		return "en"
	}
	return lang
}

