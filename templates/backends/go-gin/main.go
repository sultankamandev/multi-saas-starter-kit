package main

import (
	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/routes"
	"saas-starter/backend/go-api/utils"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		panic("Error loading .env file")
	}

	// Load locales
	if err := utils.LoadLocales(); err != nil {
		log.Fatal("❌ Failed to load locales:", err)
	}

	// Connect to database
	database.ConnectDB()

	// Auto-migrate the User, AdminAction, PasswordResetToken, EmailVerificationToken, RefreshToken, TwoFactorToken, RecoveryCode, LoginEvent, and AppSettings models
	database.DB.AutoMigrate(&models.User{}, &models.AdminAction{}, &models.PasswordResetToken{}, &models.EmailVerificationToken{}, &models.RefreshToken{}, &models.TwoFactorToken{}, &models.RecoveryCode{}, &models.LoginEvent{}, &models.AppSettings{})

	// Initialize default app settings if they don't exist
	initializeAppSettings()

	r := gin.Default()

	// Add CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Accept-Language"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Setup routes
	routes.SetupAuthRoutes(r)

	r.GET("/ping", func(c *gin.Context) { c.JSON(200, gin.H{"message": "pong"}) })
	r.Run(":8080")
}

// initializeAppSettings creates default app settings if they don't exist
func initializeAppSettings() {
	// Get default values from environment or use defaults
	emailVerificationDefault := "true"
	if envValue := os.Getenv("REQUIRE_EMAIL_VERIFICATION"); envValue != "" {
		emailVerificationDefault = envValue
	}

	twoFADefault := "false"
	if envValue := os.Getenv("REQUIRE_2FA"); envValue != "" {
		twoFADefault = envValue
	}

	// Initialize require_email_verification setting
	if models.GetSetting("require_email_verification", "") == "" {
		if err := models.SetSetting("require_email_verification", emailVerificationDefault); err != nil {
			log.Printf("⚠️  Failed to initialize require_email_verification setting: %v", err)
		} else {
			log.Printf("✅ Initialized require_email_verification setting: %s", emailVerificationDefault)
		}
	}

	// Initialize require_2fa setting
	if models.GetSetting("require_2fa", "") == "" {
		if err := models.SetSetting("require_2fa", twoFADefault); err != nil {
			log.Printf("⚠️  Failed to initialize require_2fa setting: %v", err)
		} else {
			log.Printf("✅ Initialized require_2fa setting: %s", twoFADefault)
		}
	}
}
