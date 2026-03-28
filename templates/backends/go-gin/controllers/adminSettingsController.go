package controllers

import (
	"log"
	"net/http"
	"strconv"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetAppSettings returns all application settings
// GET /api/admin/settings
func GetAppSettings(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var settings []models.AppSettings
	if err := database.DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
		"count":    len(settings),
	})
}

// GetAppSetting returns a specific setting by key
// GET /api/admin/settings/:key
func GetAppSetting(c *gin.Context) {
	lang := c.MustGet("lang").(string)
	key := c.Param("key")

	var setting models.AppSettings
	if err := database.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": utils.T(lang, "SettingNotFound")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{"setting": setting})
}

// UpdateAppSetting updates a setting value
// PUT /api/admin/settings/:key
func UpdateAppSetting(c *gin.Context) {
	lang := c.MustGet("lang").(string)
	key := c.Param("key")

	var input struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Update or create setting
	if err := models.SetSetting(key, input.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Get updated setting
	var setting models.AppSettings
	database.DB.Where("key = ?", key).First(&setting)

	// Log admin action
	logAdminSettingAction(c, "UPDATE_SETTING", "Updated setting: "+key, key, input.Value)

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "SettingUpdatedSuccessfully"),
		"setting":  setting,
	})
}

// GetVerificationSetting returns the current email verification requirement setting
// GET /api/admin/settings/verification/status
func GetVerificationSetting(c *gin.Context) {
	_ = c.MustGet("lang").(string) // Language for potential future use

	// Check database first, then fallback to environment variable
	dbValue := models.GetSetting("require_email_verification", "")
	envValue := utils.IsEmailVerificationRequired()

	var requireVerification bool
	if dbValue != "" {
		// Database setting takes precedence
		requireVerification, _ = strconv.ParseBool(dbValue)
	} else {
		// Fallback to environment variable
		requireVerification = envValue
	}

	source := "environment"
	if dbValue != "" {
		source = "database"
	}

	c.JSON(http.StatusOK, gin.H{
		"require_email_verification": requireVerification,
		"source":                     source,
	})
}

// UpdateVerificationSetting updates the email verification requirement setting
// PUT /api/admin/settings/verification
func UpdateVerificationSetting(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var input struct {
		RequireEmailVerification *bool `json:"require_email_verification" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Save to database
	value := strconv.FormatBool(*input.RequireEmailVerification)
	if err := models.SetSetting("require_email_verification", value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Log admin action
	logAdminSettingAction(c, "UPDATE_VERIFICATION_SETTING",
		"Updated email verification requirement to "+value,
		"require_email_verification", value)

	c.JSON(http.StatusOK, gin.H{
		"message":                   utils.T(lang, "SettingUpdatedSuccessfully"),
		"require_email_verification": input.RequireEmailVerification,
	})
}

// logAdminSettingAction logs an admin action related to settings
func logAdminSettingAction(c *gin.Context, action, message, key, value string) {
	// Get admin ID from context (set by AuthMiddleware)
	adminID, exists := c.Get("userID")
	if !exists {
		return
	}

	// Get admin email from database
	var admin models.User
	if err := database.DB.First(&admin, adminID).Error; err != nil {
		admin.Email = "unknown"
	} else {
		if admin.Email == "" {
			admin.Email = "unknown"
		}
	}

	// Log to console for now (can be extended to database)
	log.Printf("[ADMIN_ACTION] [%s] Admin: %s (%d) - %s - Setting: %s = %s",
		action, admin.Email, adminID, message, key, value)
}

// Get2FASetting returns the current 2FA requirement setting
// GET /api/admin/settings/2fa/status
func Get2FASetting(c *gin.Context) {
	_ = c.MustGet("lang").(string) // Language for potential future use

	// Check database first, then fallback to environment variable
	dbValue := models.GetSetting("require_2fa", "")
	envValue := utils.Is2FARequired()

	var require2FA bool
	if dbValue != "" {
		// Database setting takes precedence
		require2FA, _ = strconv.ParseBool(dbValue)
	} else {
		// Fallback to environment variable
		require2FA = envValue
	}

	source := "environment"
	if dbValue != "" {
		source = "database"
	}

	c.JSON(http.StatusOK, gin.H{
		"require_2fa": require2FA,
		"source":      source,
	})
}

// Update2FASetting updates the 2FA requirement setting
// PUT /api/admin/settings/2fa
func Update2FASetting(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	var input struct {
		Require2FA *bool `json:"require_2fa" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := utils.FormatValidationErrors(err, lang)
		c.JSON(http.StatusBadRequest, gin.H{"errors": validationErrors})
		return
	}

	// Save to database
	value := strconv.FormatBool(*input.Require2FA)
	if err := models.SetSetting("require_2fa", value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": utils.T(lang, "DatabaseError")})
		return
	}

	// Log admin action
	logAdminSettingAction(c, "UPDATE_2FA_SETTING",
		"Updated 2FA requirement to "+value,
		"require_2fa", value)

	c.JSON(http.StatusOK, gin.H{
		"message":     utils.T(lang, "SettingUpdatedSuccessfully"),
		"require_2fa": *input.Require2FA,
	})
}
