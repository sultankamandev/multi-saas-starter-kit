package routes

import (
	"saas-starter/backend/go-api/controllers"
	"saas-starter/backend/go-api/middleware"

	"github.com/gin-gonic/gin"
)

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(r *gin.Engine) {
	// Apply language middleware to all routes
	r.Use(middleware.LanguageMiddleware())

	auth := r.Group("/auth")
	{
		// Apply rate limiting to sensitive authentication endpoints
		auth.POST("/register", middleware.RateLimiter(), controllers.Register)
		auth.POST("/login", middleware.RateLimiter(), controllers.Login)
		auth.POST("/google", middleware.RateLimiter(), controllers.GoogleLogin) // Google OAuth2 login
		auth.POST("/forgot-password", middleware.RateLimiter(), controllers.ForgotPassword)
		auth.POST("/reset-password", middleware.RateLimiter(), controllers.ResetPassword)
		auth.POST("/verify-2fa", middleware.RateLimiter(), controllers.Verify2FA)              // Email-based 2FA
		auth.POST("/resend-2fa", middleware.RateLimiter(), controllers.Resend2FACode)          // Resend email-based 2FA code
		auth.POST("/verify-totp-login", middleware.RateLimiter(), controllers.VerifyTOTPLogin) // TOTP-based 2FA
		auth.POST("/use-recovery-code", middleware.RateLimiter(), controllers.UseRecoveryCode) // Recovery code login

		// Protected endpoints (require authentication)
		auth.POST("/setup-2fa", middleware.AuthMiddleware(), controllers.Setup2FA)
		auth.POST("/verify-2fa-setup", middleware.AuthMiddleware(), controllers.Verify2FASetup)
		auth.POST("/refresh", controllers.RefreshToken)
		auth.POST("/refresh-token", controllers.RefreshToken) // alias for Node-style clients
		auth.POST("/logout", controllers.Logout)
		auth.GET("/me", middleware.AuthMiddleware(), controllers.GetMe)
		auth.GET("/verify-email", controllers.VerifyEmail)
	}

	// Protected dashboard route
	r.GET("/dashboard", middleware.AuthMiddleware(), controllers.Dashboard)

	// User routes (authenticated users)
	api := r.Group("/api")
	{
		api.GET("/user/profile", middleware.AuthMiddleware(), controllers.UserProfile)
		api.PUT("/user/profile", middleware.AuthMiddleware(), controllers.UpdateUserProfile)
	}

	// Admin routes (admin only)
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.AuthorizeRole("admin"))
	{
		// User CRUD operations
		admin.GET("/users", controllers.AdminUsers)                   // List all users
		admin.GET("/users/stats", controllers.AdminUserStats)         // User statistics
		admin.GET("/users/:id", controllers.AdminGetUser)             // Get user by ID
		admin.POST("/users", controllers.AdminCreateUser)             // Create new user
		admin.PUT("/users/:id", controllers.AdminUpdateUser)          // Update user (full update)
		admin.PUT("/users/:id/role", controllers.AdminUpdateUserRole) // Update user role only
		admin.DELETE("/users/:id", controllers.AdminDeleteUser)       // Delete user
		admin.GET("/actions", controllers.GetAdminActions)            // Get audit log of admin actions

		// Analytics endpoints (dashboard contract + legacy aliases)
		admin.GET("/summary", controllers.GetAdminSummary)
		admin.GET("/analytics/user-registrations", controllers.GetUserAnalytics)
		admin.GET("/analytics/users", controllers.GetUserAnalytics)              // User analytics by day
		admin.GET("/analytics/summary", controllers.GetAdminSummary)             // KPI summary for dashboard
		admin.GET("/analytics/active-users", controllers.GetActiveUserAnalytics) // Active user analytics
		admin.GET("/analytics/retention", controllers.GetUserRetentionAnalytics) // User retention analytics
		admin.GET("/analytics/cohort", controllers.GetCohortAnalytics)           // Cohort retention heatmap data

		// Blocked IPs management
		admin.GET("/blocked-ips", controllers.GetBlockedIPs)       // List all blocked IPs
		admin.DELETE("/blocked-ips/:ip", controllers.UnblockIP)  // Unblock a specific IP

		// App Settings management
		admin.GET("/settings", controllers.GetAppSettings)                    // List all settings
		admin.GET("/settings/:key", controllers.GetAppSetting)               // Get specific setting
		admin.PUT("/settings/:key", controllers.UpdateAppSetting)            // Update specific setting
		admin.GET("/settings/verification/status", controllers.GetVerificationSetting)  // Get verification setting
		admin.PUT("/settings/verification", controllers.UpdateVerificationSetting)       // Update verification setting
		admin.GET("/settings/2fa/status", controllers.Get2FASetting)          // Get 2FA setting
		admin.PUT("/settings/2fa", controllers.Update2FASetting)              // Update 2FA setting
	}
}
