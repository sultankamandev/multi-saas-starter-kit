package router

import (
	"time"

	"saas-starter/backend/go-api/internal/handler"
	"saas-starter/backend/go-api/internal/middleware"
	jwtPlatform "saas-starter/backend/go-api/internal/platform/jwt"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth        *handler.AuthHandler
	TwoFA       *handler.TwoFAHandler
	Password    *handler.PasswordHandler
	OAuth       *handler.OAuthHandler
	User        *handler.UserHandler
	AdminUser   *handler.AdminUserHandler
	Analytics   *handler.AdminAnalyticsHandler
	Settings    *handler.AdminSettingsHandler
	BlockedIPs  *handler.AdminBlockedIPHandler
}

func Setup(r *gin.Engine, jwtMgr *jwtPlatform.Manager, h Handlers) {
	r.Use(middleware.LanguageMiddleware())

	auth := r.Group("/auth")
	auth.Use(middleware.RateLimiter(100, 1*time.Minute, 5*time.Minute))
	{
		auth.POST("/register", h.Auth.Register)
		auth.POST("/login", h.Auth.Login)
		auth.POST("/refresh-token", h.Auth.RefreshToken)
		auth.POST("/logout", h.Auth.Logout)
		auth.POST("/forgot-password", h.Password.ForgotPassword)
		auth.POST("/reset-password", h.Password.ResetPassword)
		auth.GET("/verify-email", h.Password.VerifyEmail)
		auth.POST("/google-login", h.OAuth.GoogleLogin)

		// 2FA endpoints (no auth needed, user identified by ID)
		auth.POST("/verify-2fa", h.TwoFA.Verify2FA)
		auth.POST("/resend-2fa", h.TwoFA.Resend2FA)
		auth.POST("/verify-totp-login", h.TwoFA.VerifyTOTPLogin)
		auth.POST("/verify-recovery-code", h.TwoFA.UseRecoveryCode)

		// Authenticated auth routes
		authenticated := auth.Group("/")
		authenticated.Use(middleware.AuthMiddleware(jwtMgr))
		{
			authenticated.GET("/me", h.Auth.GetMe)
			authenticated.GET("/dashboard", h.Auth.Dashboard)
			authenticated.POST("/logout-all", h.Auth.LogoutAllSessions)

			// 2FA setup (requires auth)
			authenticated.POST("/2fa/setup", h.TwoFA.Setup2FA)
			authenticated.POST("/2fa/verify-setup", h.TwoFA.Verify2FASetup)
		}
	}

	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(jwtMgr))
	{
		// User endpoints
		api.GET("/user/profile", h.User.GetProfile)
		api.PUT("/user/profile", h.User.UpdateProfile)
	}

	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(jwtMgr))
	admin.Use(middleware.AuthorizeRole("admin"))
	{
		// User management
		admin.GET("/users", h.AdminUser.List)
		admin.GET("/users/:id", h.AdminUser.Get)
		admin.POST("/users", h.AdminUser.Create)
		admin.PUT("/users/:id", h.AdminUser.Update)
		admin.DELETE("/users/:id", h.AdminUser.Delete)
		admin.PUT("/users/:id/role", h.AdminUser.UpdateRole)
		admin.GET("/user-stats", h.AdminUser.Stats)
		admin.GET("/actions", h.AdminUser.GetActions)

		// Analytics
		admin.GET("/analytics/user-registrations", h.Analytics.UserRegistrations)
		admin.GET("/analytics/active-users", h.Analytics.ActiveUsers)
		admin.GET("/analytics/retention", h.Analytics.Retention)
		admin.GET("/analytics/cohort", h.Analytics.Cohort)
		admin.GET("/summary", h.Analytics.Summary)

		// Settings
		admin.GET("/settings", h.Settings.GetAll)
		admin.GET("/settings/:key", h.Settings.Get)
		admin.PUT("/settings/:key", h.Settings.Update)
		admin.GET("/settings/email-verification", h.Settings.GetVerificationSetting)
		admin.PUT("/settings/email-verification", h.Settings.UpdateVerificationSetting)
		admin.GET("/settings/2fa", h.Settings.Get2FASetting)
		admin.PUT("/settings/2fa", h.Settings.Update2FASetting)

		// Blocked IPs
		admin.GET("/blocked-ips", h.BlockedIPs.GetBlockedIPs)
		admin.DELETE("/blocked-ips/:ip", h.BlockedIPs.UnblockIP)
	}
}
