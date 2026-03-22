package handler

import (
	"net/http"
	"strconv"

	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type AdminSettingsHandler struct {
	settingsSvc *service.SettingsService
}

func NewAdminSettingsHandler(settingsSvc *service.SettingsService) *AdminSettingsHandler {
	return &AdminSettingsHandler{settingsSvc: settingsSvc}
}

func (h *AdminSettingsHandler) GetAll(c *gin.Context) {
	lang := getLang(c)
	settings, err := h.settingsSvc.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings, "count": len(settings)})
}

func (h *AdminSettingsHandler) Get(c *gin.Context) {
	key := c.Param("key")
	value := h.settingsSvc.Get(c.Request.Context(), key)
	if value == "" {
		lang := getLang(c)
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T(lang, "SettingNotFound")})
		return
	}
	c.JSON(http.StatusOK, gin.H{"key": key, "value": value})
}

func (h *AdminSettingsHandler) Update(c *gin.Context) {
	lang := getLang(c)
	key := c.Param("key")

	var input struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	if err := h.settingsSvc.Set(c.Request.Context(), key, input.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "SettingUpdatedSuccessfully"),
		"key":     key,
		"value":   input.Value,
	})
}

func (h *AdminSettingsHandler) GetVerificationSetting(c *gin.Context) {
	val := h.settingsSvc.Get(c.Request.Context(), "require_email_verification")
	required, _ := strconv.ParseBool(val)
	source := "database"
	if val == "" {
		required = true
		source = "default"
	}
	c.JSON(http.StatusOK, gin.H{
		"require_email_verification": required,
		"source":                     source,
	})
}

func (h *AdminSettingsHandler) UpdateVerificationSetting(c *gin.Context) {
	lang := getLang(c)
	var input struct {
		RequireEmailVerification bool `json:"require_email_verification"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	value := strconv.FormatBool(input.RequireEmailVerification)
	if err := h.settingsSvc.Set(c.Request.Context(), "require_email_verification", value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":                    i18n.T(lang, "SettingUpdatedSuccessfully"),
		"require_email_verification": input.RequireEmailVerification,
	})
}

func (h *AdminSettingsHandler) Get2FASetting(c *gin.Context) {
	val := h.settingsSvc.Get(c.Request.Context(), "require_2fa")
	required, _ := strconv.ParseBool(val)
	source := "database"
	if val == "" {
		required = false
		source = "default"
	}
	c.JSON(http.StatusOK, gin.H{
		"require_2fa": required,
		"source":      source,
	})
}

func (h *AdminSettingsHandler) Update2FASetting(c *gin.Context) {
	lang := getLang(c)
	var input struct {
		Require2FA bool `json:"require_2fa"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	value := strconv.FormatBool(input.Require2FA)
	if err := h.settingsSvc.Set(c.Request.Context(), "require_2fa", value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     i18n.T(lang, "SettingUpdatedSuccessfully"),
		"require_2fa": input.Require2FA,
	})
}
