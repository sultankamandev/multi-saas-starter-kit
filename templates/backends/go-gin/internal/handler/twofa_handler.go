package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type TwoFAHandler struct {
	twofaSvc *service.TwoFAService
}

func NewTwoFAHandler(twofaSvc *service.TwoFAService) *TwoFAHandler {
	return &TwoFAHandler{twofaSvc: twofaSvc}
}

func (h *TwoFAHandler) Verify2FA(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.Verify2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.twofaSvc.Verify2FA(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.LoginResponse{
		Message:      i18n.T(lang, "TwoFactorVerified"),
		User:         dto.UserToResponse(result.User),
		AccessToken:  result.TokenPair.AccessToken,
		RefreshToken: result.TokenPair.RefreshToken,
		ExpiresIn:    result.TokenPair.ExpiresIn,
		TokenType:    result.TokenPair.TokenType,
	})
}

func (h *TwoFAHandler) Resend2FA(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.Resend2FARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	if err := h.twofaSvc.Resend2FA(c.Request.Context(), req.UserID); err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     i18n.T(lang, "TwoFactorCodeSent"),
		"two_fa_type": "email",
	})
}

func (h *TwoFAHandler) Setup2FA(c *gin.Context) {
	lang := extractLanguageFromBody(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	result, err := h.twofaSvc.Setup2FA(c.Request.Context(), userID.(uint))
	if err != nil {
		writeError(c, err)
		return
	}

	result.Message = i18n.T(lang, "TwoFASetupGenerated")
	c.JSON(http.StatusOK, result)
}

func (h *TwoFAHandler) Verify2FASetup(c *gin.Context) {
	lang := extractLanguageFromBody(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	var req dto.Verify2FASetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.twofaSvc.Verify2FASetup(c.Request.Context(), userID.(uint), req.Code)
	if err != nil {
		writeError(c, err)
		return
	}

	result.Message = i18n.T(lang, "TwoFAEnabledSuccess")
	result.Warning = i18n.T(lang, "RecoveryCodesWarning")
	c.JSON(http.StatusOK, result)
}

func (h *TwoFAHandler) VerifyTOTPLogin(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.VerifyTOTPLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.twofaSvc.VerifyTOTPLogin(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.LoginResponse{
		Message:      i18n.T(lang, "TwoFactorVerified"),
		User:         dto.UserToResponse(result.User),
		AccessToken:  result.TokenPair.AccessToken,
		RefreshToken: result.TokenPair.RefreshToken,
		ExpiresIn:    result.TokenPair.ExpiresIn,
		TokenType:    result.TokenPair.TokenType,
	})
}

func (h *TwoFAHandler) UseRecoveryCode(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.UseRecoveryCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.twofaSvc.UseRecoveryCode(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.LoginResponse{
		Message:      i18n.T(lang, "RecoveryCodeUsed"),
		User:         dto.UserToResponse(result.User),
		AccessToken:  result.TokenPair.AccessToken,
		RefreshToken: result.TokenPair.RefreshToken,
		ExpiresIn:    result.TokenPair.ExpiresIn,
		TokenType:    result.TokenPair.TokenType,
	})
}

