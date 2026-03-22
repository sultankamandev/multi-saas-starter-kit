package controllers

import (
	"log"
	"net/http"
	"strings"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UserProfile returns the current user's profile
func UserProfile(c *gin.Context) {
	lang := c.MustGet("lang").(string)

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

	userResponse := models.UserResponse{
		ID:           user.ID,
		Username:     user.Username,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Email:        user.Email,
		Role:         user.Role,
		Language:     user.Language,
		Country:      user.Country,
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "UserProfile"),
		"user":    userResponse,
	})
}

// UpdateUserProfile allows users to update their own profile
func UpdateUserProfile(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
		return
	}

	var input struct {
		Username     string `json:"username"` // Username (optional, validated if provided)
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Language     string `json:"language"`
		Country      string `json:"country"`
		Address      string `json:"address"`
		Phone        string `json:"phone"`
		TwoFAEnabled *bool  `json:"two_fa_enabled"` // Enable/disable 2FA for this user
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Debug: Log received input
	log.Printf("📝 UpdateUserProfile received - TwoFAEnabled: %v (nil: %v)", input.TwoFAEnabled, input.TwoFAEnabled == nil)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "UserNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Update username if provided
	if input.Username != "" {
		normalizedUsername := utils.NormalizeUsername(input.Username)
		if err := utils.ValidateUsername(normalizedUsername); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// Check if username is available (excluding current user)
		available, err := utils.IsUsernameAvailable(normalizedUsername, user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
			return
		}
		if !available {
			c.JSON(http.StatusConflict, gin.H{"error": utils.T(lang, "UsernameAlreadyTaken")})
			return
		}
		user.Username = normalizedUsername
	}

	// Update allowed fields (users can't change email or role)
	if input.FirstName != "" {
		user.FirstName = input.FirstName
	}
	if input.LastName != "" {
		user.LastName = input.LastName
	}
	if input.Language != "" {
		// Normalize and validate language
		langCode := input.Language
		if len(langCode) > 2 {
			langCode = langCode[:2]
		}
		if utils.IsLanguageSupported(langCode) {
			user.Language = langCode
		}
	}
	if input.Country != "" {
		// Normalize country code (uppercase, max 10 chars)
		country := strings.ToUpper(input.Country)
		if len(country) > 10 {
			country = country[:10]
		}
		user.Country = country
	}
	if input.Address != "" {
		user.Address = input.Address
	}
	if input.Phone != "" {
		user.Phone = input.Phone
	}

	// Update 2FA enabled status if provided
	// Note: We check for nil to allow omitting the field, but if it's sent (even as false), we update it
	if input.TwoFAEnabled != nil {
		oldValue := user.TwoFAEnabled
		newValue := *input.TwoFAEnabled
		user.TwoFAEnabled = newValue
		// If disabling 2FA, also clear TOTP secret if it exists
		if !newValue && user.TwoFASecret != "" {
			user.TwoFASecret = ""
			log.Printf("🗑️  Cleared TOTP secret for user %d (2FA disabled)", user.ID)
		}
		// Log the change for debugging
		log.Printf("🔄 User %d 2FA status changed: %v -> %v", user.ID, oldValue, newValue)
	} else {
		log.Printf("⚠️  TwoFAEnabled field not provided in request (nil)")
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
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
		Address:      user.Address,
		Phone:        user.Phone,
		Verified:     user.Verified,
		TwoFAEnabled: user.TwoFAEnabled,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "ProfileUpdated"),
		"user":    userResponse,
	})
}
