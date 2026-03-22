package controllers

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	cryptorand "crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
	"gorm.io/gorm"
)

// GoogleLogin handles Google OAuth2 login
func GoogleLogin(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		Token      string `json:"token" binding:"required"`
		RememberMe bool   `json:"remember_me"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Get Google Client ID from environment
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		log.Println("⚠️  GOOGLE_CLIENT_ID not set, skipping Google login")
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "GoogleOAuthNotConfigured")})
		return
	}

	// Validate Google ID token
	payload, err := idtoken.Validate(context.Background(), input.Token, clientID)
	if err != nil {
		log.Printf("⚠️  Invalid Google token: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidGoogleToken")})
		return
	}

	// Extract user information from Google token
	email, ok := payload.Claims["email"].(string)
	if !ok || email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "GoogleEmailNotFound")})
		return
	}

	// Extract name and split into first/last name
	fullName := ""
	if name, ok := payload.Claims["name"].(string); ok && name != "" {
		fullName = name
	} else if givenName, ok := payload.Claims["given_name"].(string); ok {
		fullName = givenName
		if familyName, ok := payload.Claims["family_name"].(string); ok {
			fullName = givenName + " " + familyName
		}
	}

	// Split full name into first and last name
	firstName := ""
	lastName := ""
	if fullName != "" {
		parts := strings.Fields(fullName)
		if len(parts) > 0 {
			firstName = parts[0]
		}
		if len(parts) > 1 {
			lastName = strings.Join(parts[1:], " ")
		}
	}

	// If no name provided, use email prefix
	if firstName == "" {
		emailParts := strings.Split(email, "@")
		firstName = emailParts[0]
	}

	// Check if user already exists
	var user models.User
	err = database.DB.Where("email = ?", email).First(&user).Error

	if err == gorm.ErrRecordNotFound {
		// User doesn't exist - create new user
		// Generate a random password hash for OAuth users (required by DB constraint)
		randomBytes := make([]byte, 32)
		if _, err := cryptorand.Read(randomBytes); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
		randomPassword := hex.EncodeToString(randomBytes)
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToHashPassword")})
			return
		}

		// Get language from Google profile or use default
		userLanguage := "en"
		if locale, ok := payload.Claims["locale"].(string); ok && locale != "" {
			// Extract language code from locale (e.g., "en_US" -> "en")
			langParts := strings.Split(locale, "_")
			if len(langParts) > 0 {
				langCode := strings.ToLower(langParts[0])
				if utils.IsLanguageSupported(langCode) {
					userLanguage = langCode
				}
			}
		}

		// Auto-detect country from IP if not already set
		detectedCountry := utils.GetCountryFromIP(c.ClientIP())
		if detectedCountry != "" {
			log.Printf("🌍 Auto-detected country %s for Google user from IP %s", detectedCountry, c.ClientIP())
		}

		// Create new user
		user = models.User{
			FirstName:    firstName,
			LastName:     lastName,
			Email:        email,
			PasswordHash: string(hashedPassword), // Random hash for OAuth users
			Role:         "user",
			Verified:     true, // Google accounts are pre-verified
			Language:     userLanguage,
			Country:      detectedCountry,
		}

		if err := database.DB.Create(&user).Error; err != nil {
			log.Printf("⚠️  Failed to create user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToCreateUser")})
			return
		}

		log.Printf("✅ New Google OAuth user created: %s", email)
	} else if err != nil {
		// Database error
		log.Printf("⚠️  Database error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	} else {
		// User exists - update name if it's empty or different
		updated := false
		if user.FirstName == "" && firstName != "" {
			user.FirstName = firstName
			updated = true
		}
		if user.LastName == "" && lastName != "" {
			user.LastName = lastName
			updated = true
		}
		// Mark as verified if not already
		if !user.Verified {
			user.Verified = true
			updated = true
		}
		if updated {
			if err := database.DB.Save(&user).Error; err != nil {
				log.Printf("⚠️  Failed to update user: %v", err)
			}
		}
		log.Printf("✅ Existing user logged in via Google: %s", email)
	}

	// Check if user has TOTP 2FA enabled
	if user.TwoFAEnabled && user.TwoFASecret != "" {
		// User has TOTP 2FA enabled - require TOTP code
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"two_fa_type":  "totp",
			"user_id":      user.ID,
			"message":      utils.T(lang, "TOTPCodeRequired"),
		})
		return
	}

	// Generate access and refresh tokens
	accessToken, err := utils.GenerateToken(user.ID, user.Role, 15*time.Minute)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerateToken")})
		return
	}

	// Generate refresh token
	rtBytes := make([]byte, 32)
	if _, err := cryptorand.Read(rtBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerateToken")})
		return
	}
	rtString := hex.EncodeToString(rtBytes)

	// Set expiration based on "Remember Me" checkbox
	refreshExpiry := time.Now().Add(24 * time.Hour)
	if input.RememberMe {
		refreshExpiry = time.Now().Add(7 * 24 * time.Hour)
	}

	// Create refresh token record
	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     rtString,
		ExpiresAt: refreshExpiry,
		Revoked:   false,
	}

	if err := database.DB.Create(&refreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Return user data without password
	userResponse := models.UserResponse{
		ID:        user.ID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Role:      user.Role,
		Language:  user.Language,
		Verified:  user.Verified,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}

	// Record login event (async, don't block response)
	// Note: recordLoginEvent is defined in authController.go
	go func() {
		loginEvent := models.LoginEvent{
			UserID:    user.ID,
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			LoggedAt:  time.Now(),
		}

		if err := database.DB.Create(&loginEvent).Error; err != nil {
			log.Printf("⚠️  Failed to record login event for user %d: %v", user.ID, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":       utils.T(lang, "GoogleLoginSuccess"),
		"user":          userResponse,
		"access_token":  accessToken,
		"refresh_token": rtString,
		"expires_in":    900, // 15 minutes in seconds
		"token_type":    "Bearer",
	})
}
