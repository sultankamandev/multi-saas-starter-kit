package controllers

import (
	cryptorand "crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Register handles user registration
func Register(c *gin.Context) {
	// Extract language from request body for validation errors
	requestLang := utils.ExtractLanguageFromRequest(c)

	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Use request language for validation errors
		validationErrors := utils.FormatValidationErrors(err, requestLang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Verify reCAPTCHA token (if provided)
	if req.RecaptchaToken != "" {
		valid, score, err := utils.VerifyRecaptcha(req.RecaptchaToken, "register")
		if err != nil {
			log.Printf("⚠️  reCAPTCHA verification error: %v (score: %.2f)", err, score)
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(requestLang, "RecaptchaVerificationFailed")})
			return
		}
		if !valid {
			log.Printf("⚠️  reCAPTCHA verification failed (score: %.2f)", score)
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(requestLang, "RecaptchaVerificationFailed")})
			return
		}
		log.Printf("✅ reCAPTCHA verified (score: %.2f)", score)
	}

	// Use language from request body, or fallback to extracted language, or middleware language
	lang := req.Language
	if lang == "" {
		lang = requestLang
		if lang == "" {
			if langVal, exists := c.Get("lang"); exists {
				lang = langVal.(string)
			} else {
				lang = "en"
			}
		}
	}
	// Normalize language code
	if len(lang) > 2 {
		lang = lang[:2]
	}
	lang = strings.ToLower(lang)
	if !utils.IsLanguageSupported(lang) {
		lang = "en"
	}

	// Validate username
	normalizedUsername := utils.NormalizeUsername(req.Username)
	if err := utils.ValidateUsername(normalizedUsername); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if username is available
	available, err := utils.IsUsernameAvailable(normalizedUsername)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}
	if !available {
		c.JSON(http.StatusConflict, gin.H{"error": utils.T(lang, "UsernameAlreadyTaken")})
		return
	}

	// Check if user already exists by email (including soft-deleted users)
	var existingUser models.User
	if err := database.DB.Unscoped().Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		// User exists - check if soft-deleted
		if existingUser.DeletedAt.Valid {
			// User was soft-deleted - delete all related records first, then permanently delete user
			userID := existingUser.ID

			// Delete all related records (using Unscoped to permanently delete)
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.EmailVerificationToken{})
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.TwoFactorToken{})
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.RefreshToken{})
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.RecoveryCode{})
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.PasswordResetToken{})
			database.DB.Unscoped().Where("user_id = ?", userID).Delete(&models.LoginEvent{})

			// Permanently delete the user
			if err := database.DB.Unscoped().Delete(&existingUser).Error; err != nil {
				log.Printf("⚠️  Failed to permanently delete soft-deleted user %s: %v", req.Email, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
				return
			}
			log.Printf("🗑️  Permanently deleted soft-deleted user with email %s and all related records to allow re-registration", req.Email)
		} else {
			// User exists and is not deleted
			c.JSON(http.StatusConflict, gin.H{"error": utils.T(lang, "UserAlreadyExists")})
			return
		}
	} else if err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Hash password with cost 10
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToHashPassword")})
		return
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "user"
	}

	// Set default language if not provided
	language := req.Language
	if language == "" {
		language = "en"
	}

	// Normalize country code (uppercase, max 10 chars)
	country := req.Country
	if country != "" {
		country = strings.ToUpper(country)
		if len(country) > 10 {
			country = country[:10]
		}
	} else {
		// Try to auto-detect country from IP if not provided
		// Uses a quick async call with 3-second timeout to avoid blocking registration
		detectedCountry := utils.GetCountryFromIP(c.ClientIP())
		if detectedCountry != "" {
			country = detectedCountry
			log.Printf("🌍 Auto-detected country %s for new user from IP %s", detectedCountry, c.ClientIP())
		} else {
			// Fallback: try to infer country from language
			// This helps when IP detection fails (e.g., localhost, VPN, API errors)
			if inferredCountry := utils.GetCountryFromLanguage(language); inferredCountry != "" {
				country = inferredCountry
				log.Printf("🌍 Inferred country %s from language %s for new user", inferredCountry, language)
			} else {
				log.Printf("⚠️  Could not detect country for new user (IP: %s, Language: %s)", c.ClientIP(), language)
			}
		}
	}

	// Create user - auto-verify if verification is not required globally
	shouldVerify := !utils.IsEmailVerificationRequired()
	// Set TwoFAEnabled based on global 2FA requirement
	twoFAEnabled := utils.Is2FARequired()
	user := models.User{
		Username:     normalizedUsername, // Store normalized (lowercase) username
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Language:     language,
		Country:      country,
		Verified:     shouldVerify, // Auto-verify if verification is disabled globally
		TwoFAEnabled: twoFAEnabled, // Enable 2FA if globally required
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToCreateUser")})
		return
	}

	// Only send verification email if verification is required
	if utils.IsEmailVerificationRequired() {
		// Generate verification token
		verificationToken, expiry := utils.GenerateResetToken() // Reuse token generator

		// Create email verification token record
		emailVerificationToken := models.EmailVerificationToken{
			UserID:    user.ID,
			Token:     verificationToken,
			ExpiresAt: expiry,
			Used:      false,
		}

		if err := database.DB.Create(&emailVerificationToken).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}

		// Generate verification link (frontend URL)
		frontendURL := getFrontendURL() + "/verify-email?token=" + verificationToken

		// Send verification email asynchronously
		go func() {
			userName := user.FirstName
			if user.LastName != "" {
				userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
			}
			if userName == "" {
				userName = "User"
			}

			if err := utils.SendVerificationEmail(user.Email, frontendURL, user.Language, userName); err != nil {
				log.Printf("⚠️  Failed to send verification email to %s: %v", user.Email, err)
			}
		}()
	}

	// Return success message
	var message string
	if utils.IsEmailVerificationRequired() {
		message = utils.T(lang, "UserRegisteredPleaseVerify")
	} else {
		message = utils.T(lang, "UserRegisteredSuccess")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": message,
		"user": models.UserResponse{
			ID:        user.ID,
			Username:  user.Username,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Email:     user.Email,
			Role:      user.Role,
			Language:  user.Language,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
	})
}

// Login handles user login
func Login(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidRequest")})
		return
	}

	// Verify reCAPTCHA token (if provided)
	if req.RecaptchaToken != "" {
		valid, score, err := utils.VerifyRecaptcha(req.RecaptchaToken, "login")
		if err != nil {
			log.Printf("⚠️  reCAPTCHA verification error: %v (score: %.2f)", err, score)
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "RecaptchaVerificationFailed")})
			return
		}
		if !valid {
			log.Printf("⚠️  reCAPTCHA verification failed (score: %.2f)", score)
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "RecaptchaVerificationFailed")})
			return
		}
		log.Printf("✅ reCAPTCHA verified (score: %.2f)", score)
	}

	// Find user by email or username
	// email_or_username can be either an email address or a username
	emailOrUsername := strings.TrimSpace(req.EmailOrUsername)
	normalizedInput := strings.ToLower(emailOrUsername)

	var user models.User
	// Try to find by email first (if it contains @, it's likely an email)
	if strings.Contains(normalizedInput, "@") {
		if err := database.DB.Where("LOWER(email) = ?", normalizedInput).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidCredentials")})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
	} else {
		// Try to find by username (case-insensitive)
		if err := database.DB.Where("LOWER(username) = ?", normalizedInput).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidCredentials")})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidCredentials")})
		return
	}

	// Check if user has verified their email (only if verification is required globally)
	if utils.IsEmailVerificationRequired() && !user.Verified {
		c.JSON(http.StatusForbidden, gin.H{"error": utils.T(lang, "EmailNotVerified")})
		return
	}

	// Check if 2FA is required for this user
	// If user has two_fa_enabled = true, always require 2FA
	if user.TwoFAEnabled {
		// Check if user has TOTP 2FA enabled (TOTP takes precedence over email)
		if user.TwoFASecret != "" {
			// User has TOTP 2FA enabled - require TOTP code
			c.JSON(http.StatusOK, gin.H{
				"requires_2fa": true,
				"two_fa_type":  "totp",
				"user_id":      user.ID,
				"message":      utils.T(lang, "TOTPCodeRequired"),
			})
			return
		}

		// User has 2FA enabled but no TOTP secret - use email-based 2FA
		// Invalidate any existing unused 2FA tokens for this user
		database.DB.Model(&models.TwoFactorToken{}).
			Where("user_id = ? AND used = ?", user.ID, false).
			Update("used", true)

		// Generate 6-digit 2FA code
		code := fmt.Sprintf("%06d", rand.Intn(1000000))

		// Create 2FA token record
		twoFAToken := models.TwoFactorToken{
			UserID:     user.ID,
			Code:       code,
			RememberMe: req.RememberMe, // Store Remember Me preference
			ExpiresAt:  time.Now().Add(5 * time.Minute),
			Used:       false,
		}

		if err := database.DB.Create(&twoFAToken).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}

		// Send 2FA code via email asynchronously
		go func() {
			userName := user.FirstName
			if user.LastName != "" {
				userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
			}
			if userName == "" {
				userName = "User"
			}

			// Use user's language preference, fallback to request language
			emailLang := user.Language
			if emailLang == "" {
				emailLang = lang
			}

			if err := utils.Send2FACodeEmail(user.Email, code, emailLang, userName); err != nil {
				log.Printf("❌ CRITICAL: Failed to send 2FA code to %s: %v", user.Email, err)
				log.Printf("📧 2FA Code for %s: %s (valid for 5 minutes)", user.Email, code)
				log.Printf("⚠️  Please configure SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) to enable email sending")
			} else {
				log.Printf("✅ 2FA code email sent successfully to %s", user.Email)
			}
		}()

		c.JSON(http.StatusOK, gin.H{
			"message":     utils.T(lang, "TwoFactorCodeSent"),
			"two_fa_type": "email",
			"user_id":     user.ID,
		})
		return
	}

	// 2FA is not required and user doesn't have it enabled - proceed with normal login
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
	if req.RememberMe {
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
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	// Record login event (async, don't block response)
	go recordLoginEvent(user.ID, c)

	c.JSON(http.StatusOK, gin.H{
		"message":       utils.T(lang, "LoginSuccess"),
		"user":          userResponse,
		"access_token":  accessToken,
		"refresh_token": rtString,
		"expires_in":    900, // 15 minutes in seconds
		"token_type":    "Bearer",
	})
}

// GetMe returns the current user's profile
func GetMe(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
		return
	}

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"user": userResponse})
}

// Logout handles user logout and revokes refresh token
func Logout(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Revoke the refresh token
	result := database.DB.Model(&models.RefreshToken{}).
		Where("token = ?", input.RefreshToken).
		Update("revoked", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	if result.RowsAffected == 0 {
		// Token not found - still return success for security (don't leak info)
		c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "LoggedOutSuccess")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "LoggedOutSuccess")})
}

// Dashboard returns a protected dashboard page
func Dashboard(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
		return
	}

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "WelcomeDashboard"),
		"user":    userResponse,
		"dashboard": gin.H{
			"title": utils.T(lang, "DashboardTitle"),
			"features": []string{
				utils.T(lang, "ViewProfile"),
				utils.T(lang, "UpdatePersonalInfo"),
				utils.T(lang, "AccessAppFeatures"),
			},
		},
	})
}

// ForgotPassword handles the forgot password request
func ForgotPassword(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		// Avoid information leakage - always return success message even if user doesn't exist
		c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "ResetLinkSent")})
		return
	}

	// Use user's language preference for email, fallback to request language
	emailLang := user.Language
	if emailLang == "" {
		emailLang = lang
	}
	if emailLang == "" {
		emailLang = "en"
	}

	// Invalidate any existing unused tokens for this user
	database.DB.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND used = ?", user.ID, false).
		Update("used", true)

	// Generate reset token
	token, expiry := utils.GenerateResetToken()

	// Create password reset token record
	resetToken := models.PasswordResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: expiry,
		Used:      false,
	}

	if err := database.DB.Create(&resetToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Generate reset link (frontend URL)
	frontendURL := getFrontendURL() + "/reset-password?token=" + token
	if err := utils.SendResetEmail(user.Email, frontendURL, emailLang); err != nil {
		// Log error but don't expose it to user for security
		c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "ResetLinkSent")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "ResetLinkSent")})
}

// ResetPassword handles the password reset request
func ResetPassword(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8,max=255"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Find password reset token
	var resetToken models.PasswordResetToken
	if err := database.DB.Where("token = ? AND used = ?", input.Token, false).First(&resetToken).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidOrExpiredToken")})
		return
	}

	// Check if token is expired
	if time.Now().After(resetToken.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidOrExpiredToken")})
		return
	}

	// Find the user
	var user models.User
	if err := database.DB.First(&user, resetToken.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
		return
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToHashPassword")})
		return
	}

	// Update password
	user.PasswordHash = string(hash)
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Mark token as used
	resetToken.Used = true
	if err := database.DB.Save(&resetToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "PasswordResetSuccess")})
}

// VerifyEmail handles email verification via token
func VerifyEmail(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidToken")})
		return
	}

	// Find email verification token
	var verificationToken models.EmailVerificationToken
	if err := database.DB.Where("token = ? AND used = ?", token, false).First(&verificationToken).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "InvalidOrExpiredToken")})
		return
	}

	// Check if token is expired
	if time.Now().After(verificationToken.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidOrExpiredToken")})
		return
	}

	// Find the user
	var user models.User
	if err := database.DB.First(&user, verificationToken.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
		return
	}

	// Mark user as verified
	user.Verified = true
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Mark token as used
	verificationToken.Used = true
	if err := database.DB.Save(&verificationToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": utils.T(lang, "EmailVerifiedSuccess")})
}

// RefreshToken handles refresh token exchange for new access token
func RefreshToken(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Find refresh token in database
	var storedToken models.RefreshToken
	if err := database.DB.Where("token = ?", input.RefreshToken).First(&storedToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidToken")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Check if token is revoked or expired
	if storedToken.Revoked {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "TokenRevoked")})
		return
	}

	if time.Now().After(storedToken.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "TokenExpired")})
		return
	}

	// Find the user
	var user models.User
	if err := database.DB.First(&user, storedToken.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Generate new access token (15 minutes)
	accessToken, err := utils.GenerateToken(user.ID, user.Role, 15*time.Minute)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerateToken")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"expires_in":   900, // 15 minutes in seconds
		"token_type":   "Bearer",
	})
}

// Verify2FA handles 2FA code verification and issues access + refresh tokens
func Verify2FA(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		UserID uint   `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Find 2FA token in database
	var twoFAToken models.TwoFactorToken
	if err := database.DB.Where("user_id = ? AND code = ? AND used = ?", input.UserID, input.Code, false).First(&twoFAToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":      utils.T(lang, "Invalid2FACode"),
				"error_code": "INVALID_2FA_CODE",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}

	// Check if code is expired
	if time.Now().After(twoFAToken.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":      utils.T(lang, "TwoFactorCodeExpired"),
			"error_code": "TWO_FA_CODE_EXPIRED",
		})
		return
	}

	// Mark code as used
	twoFAToken.Used = true
	if err := database.DB.Save(&twoFAToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Find the user
	var user models.User
	if err := database.DB.First(&user, input.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Now issue access and refresh tokens
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

	// Set expiration based on "Remember Me" preference from 2FA token
	refreshExpiry := time.Now().Add(24 * time.Hour)
	if twoFAToken.RememberMe {
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
	go recordLoginEvent(user.ID, c)

	c.JSON(http.StatusOK, gin.H{
		"message":       utils.T(lang, "TwoFactorVerified"),
		"user":          userResponse,
		"access_token":  accessToken,
		"refresh_token": rtString,
		"expires_in":    900, // 15 minutes in seconds
		"token_type":    "Bearer",
	})
}

// Resend2FACode resends a new 2FA code to the user's email
func Resend2FACode(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		UserID interface{} `json:"user_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Convert user_id to uint (handles both string and number from JSON)
	var userID uint
	switch v := input.UserID.(type) {
	case float64:
		userID = uint(v)
	case string:
		id, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidUserID")})
			return
		}
		userID = uint(id)
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "InvalidUserID")})
		return
	}

	// Find the user
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Check if user has TOTP 2FA enabled (no need to resend email code for TOTP users)
	if user.TwoFAEnabled && user.TwoFASecret != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "TOTPCodeRequired")})
		return
	}

	// Invalidate any existing unused 2FA tokens for this user
	database.DB.Model(&models.TwoFactorToken{}).
		Where("user_id = ? AND used = ?", userID, false).
		Update("used", true)

	// Generate new 6-digit 2FA code
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Create new 2FA token record
	twoFAToken := models.TwoFactorToken{
		UserID:    user.ID,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		Used:      false,
	}

	if err := database.DB.Create(&twoFAToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Send 2FA code via email asynchronously
	go func() {
		userName := user.FirstName
		if user.LastName != "" {
			userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
		}
		if userName == "" {
			userName = "User"
		}

		// Use user's language preference, fallback to request language
		emailLang := user.Language
		if emailLang == "" {
			emailLang = lang
		}

		if err := utils.Send2FACodeEmail(user.Email, code, emailLang, userName); err != nil {
			log.Printf("⚠️  Failed to send 2FA code to %s: %v", user.Email, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":     utils.T(lang, "TwoFactorCodeSent"),
		"two_fa_type": "email",
		"user_id":     user.ID,
	})
}

// Setup2FA generates a TOTP secret and QR code URL for enabling 2FA
func Setup2FA(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Generate TOTP secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SaaS Starter",
		AccountName: user.Email,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerate2FA")})
		return
	}

	// Store secret temporarily (not enabled yet - user must verify first)
	user.TwoFASecret = key.Secret()
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"otpauth_url": key.URL(),    // Frontend will render QR code from this URL
		"secret":      key.Secret(), // For manual entry if QR code fails
		"message":     utils.T(lang, "TwoFASetupGenerated"),
	})
}

// Verify2FASetup verifies the TOTP code from the authenticator app before enabling 2FA
func Verify2FASetup(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
		return
	}

	var input struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	if user.TwoFASecret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "TwoFANotSetup")})
		return
	}

	// Validate TOTP code
	valid := totp.Validate(input.Code, user.TwoFASecret)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":      utils.T(lang, "Invalid2FACode"),
			"error_code": "INVALID_2FA_CODE",
		})
		return
	}

	// Enable 2FA for user
	user.TwoFAEnabled = true
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Generate 10 recovery codes (one-time use backup codes)
	var recoveryCodes []string
	for i := 0; i < 10; i++ {
		// Generate 8-byte random code (16 hex characters)
		b := make([]byte, 8)
		if _, err := cryptorand.Read(b); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerateToken")})
			return
		}
		code := hex.EncodeToString(b)
		recoveryCodes = append(recoveryCodes, code)

		// Hash the code (like passwords) before storing
		hashed, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "FailedToGenerateToken")})
			return
		}

		// Store hashed recovery code
		recoveryCode := models.RecoveryCode{
			UserID:   user.ID,
			CodeHash: string(hashed),
			Used:     false,
		}

		if err := database.DB.Create(&recoveryCode).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        utils.T(lang, "TwoFAEnabledSuccess"),
		"recovery_codes": recoveryCodes, // Only shown once - user must save these!
		"warning":        utils.T(lang, "RecoveryCodesWarning"),
	})
}

// VerifyTOTPLogin verifies TOTP code during login and issues tokens
func VerifyTOTPLogin(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var req struct {
		UserID     uint   `json:"user_id" binding:"required"`
		Code       string `json:"code" binding:"required"`
		RememberMe bool   `json:"remember_me"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	var user models.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	if !user.TwoFAEnabled || user.TwoFASecret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.T(lang, "TwoFANotEnabled")})
		return
	}

	// Validate TOTP code
	valid := totp.Validate(req.Code, user.TwoFASecret)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":      utils.T(lang, "Invalid2FACode"),
			"error_code": "INVALID_2FA_CODE",
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
	if req.RememberMe {
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
	go recordLoginEvent(user.ID, c)

	c.JSON(http.StatusOK, gin.H{
		"message":       utils.T(lang, "TwoFactorVerified"),
		"user":          userResponse,
		"access_token":  accessToken,
		"refresh_token": rtString,
		"expires_in":    900, // 15 minutes in seconds
		"token_type":    "Bearer",
	})
}

// recordLoginEvent records a login event for active user tracking
func recordLoginEvent(userID uint, c *gin.Context) {
	loginEvent := models.LoginEvent{
		UserID:    userID,
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		LoggedAt:  time.Now(),
	}

	if err := database.DB.Create(&loginEvent).Error; err != nil {
		log.Printf("⚠️  Failed to record login event for user %d: %v", userID, err)
	}
}

// getFrontendURL returns the frontend URL from environment variable or defaults to localhost
func getFrontendURL() string {
	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		return "http://localhost:3000"
	}
	return url
}

// UseRecoveryCode allows users to log in using a recovery code instead of TOTP
func UseRecoveryCode(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)

	var input struct {
		UserID     uint   `json:"user_id" binding:"required"`
		Code       string `json:"code" binding:"required"`
		RememberMe bool   `json:"remember_me"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Find all unused recovery codes for this user
	var recoveryCodes []models.RecoveryCode
	if err := database.DB.Where("user_id = ? AND used = ?", input.UserID, false).Find(&recoveryCodes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Check each recovery code
	for _, rc := range recoveryCodes {
		if err := bcrypt.CompareHashAndPassword([]byte(rc.CodeHash), []byte(input.Code)); err == nil {
			// Valid code found - mark as used
			now := time.Now()
			rc.Used = true
			rc.UsedAt = &now
			if err := database.DB.Save(&rc).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
				return
			}

			// Find the user
			var user models.User
			if err := database.DB.First(&user, input.UserID).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
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
				ID:           user.ID,
				Username:     user.Username,
				FirstName:    user.FirstName,
				LastName:     user.LastName,
				Email:        user.Email,
				Role:         user.Role,
				Language:     user.Language,
				Country:      user.Country,
				Verified:     user.Verified,
				TwoFAEnabled: user.TwoFAEnabled,
				CreatedAt:    user.CreatedAt,
				UpdatedAt:    user.UpdatedAt,
			}

			// Record login event (async, don't block response)
			go recordLoginEvent(user.ID, c)

			c.JSON(http.StatusOK, gin.H{
				"message":       utils.T(lang, "RecoveryCodeUsed"),
				"user":          userResponse,
				"access_token":  accessToken,
				"refresh_token": rtString,
				"expires_in":    900, // 15 minutes in seconds
				"token_type":    "Bearer",
			})
			return
		}
	}

	// No valid code found
	c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidRecoveryCode")})
}
