package main

import (
	"context"
	"log"
	"time"

	"saas-starter/backend/go-api/internal/config"
	"saas-starter/backend/go-api/internal/handler"
	"saas-starter/backend/go-api/internal/platform/captcha"
	"saas-starter/backend/go-api/internal/platform/database"
	"saas-starter/backend/go-api/internal/platform/email"
	"saas-starter/backend/go-api/internal/platform/geoip"
	jwtPlatform "saas-starter/backend/go-api/internal/platform/jwt"
	"saas-starter/backend/go-api/internal/repository"
	"saas-starter/backend/go-api/internal/router"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// --- Config ---
	cfg := config.Load()

	// --- Locales ---
	if err := i18n.LoadLocales("locales"); err != nil {
		log.Fatal("failed to load locales:", err)
	}

	// --- Database ---
	db := database.Connect(cfg.DatabaseURL)
	database.AutoMigrate(db)
	database.RunManualMigrations(db)

	// --- Infrastructure ---
	jwtMgr := jwtPlatform.NewManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience)
	txMgr := database.NewTxManager(db)
	captchaVerifier := captcha.NewRecaptchaVerifier(cfg.RecaptchaSecret)
	geoIPResolver := geoip.NewResolver()
	templateRenderer := email.NewTemplateRenderer("templates")
	emailSender := email.NewSMTPSender(cfg.SMTP, templateRenderer)

	// --- Repositories ---
	userRepo := repository.NewUserRepository(db)
	tokenRepo := repository.NewTokenRepository(db)
	twofaRepo := repository.NewTwoFARepository(db)
	loginEventRepo := repository.NewLoginEventRepository(db)
	adminActionRepo := repository.NewAdminActionRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)

	// --- Services ---
	tokenSvc := service.NewTokenService(tokenRepo, jwtMgr)
	authSvc := service.NewAuthService(
		userRepo, tokenRepo, loginEventRepo, settingsRepo,
		txMgr, tokenSvc, emailSender, captchaVerifier,
		geoIPResolver, cfg.FrontendURL,
	)
	twofaSvc := service.NewTwoFAService(userRepo, twofaRepo, txMgr, tokenSvc, emailSender, loginEventRepo)
	passwordSvc := service.NewPasswordService(userRepo, tokenRepo, txMgr, emailSender, cfg.FrontendURL)
	userSvc := service.NewUserService(userRepo)
	oauthSvc := service.NewOAuthService(userRepo, loginEventRepo, tokenSvc, geoIPResolver, cfg.GoogleClientID)
	adminUserSvc := service.NewAdminUserService(userRepo, adminActionRepo, txMgr, emailSender)
	analyticsSvc := service.NewAnalyticsService(analyticsRepo)
	settingsSvc := service.NewSettingsService(settingsRepo)

	// --- Handlers ---
	handlers := router.Handlers{
		Auth:       handler.NewAuthHandler(authSvc),
		TwoFA:      handler.NewTwoFAHandler(twofaSvc),
		Password:   handler.NewPasswordHandler(passwordSvc),
		OAuth:      handler.NewOAuthHandler(oauthSvc),
		User:       handler.NewUserHandler(userSvc),
		AdminUser:  handler.NewAdminUserHandler(adminUserSvc),
		Analytics:  handler.NewAdminAnalyticsHandler(analyticsSvc),
		Settings:   handler.NewAdminSettingsHandler(settingsSvc),
		BlockedIPs: handler.NewAdminBlockedIPHandler(),
	}

	// --- Token Cleanup ---
	cleanupSvc := service.NewCleanupService(db, 1*time.Hour)
	cleanupCtx, cleanupCancel := context.WithCancel(context.Background())
	defer cleanupCancel()
	cleanupSvc.Start(cleanupCtx)

	// --- Gin Engine ---
	r := gin.Default()
	r.Use(cors.New(cfg.CORSConfig()))

	// --- Routes ---
	router.Setup(r, jwtMgr, handlers)

	// --- Start ---
	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("failed to start server:", err)
	}
}
