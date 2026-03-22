package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type PasswordHandler struct {
	passwordSvc *service.PasswordService
}

func NewPasswordHandler(passwordSvc *service.PasswordService) *PasswordHandler {
	return &PasswordHandler{passwordSvc: passwordSvc}
}

func (h *PasswordHandler) ForgotPassword(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	// Always return success to prevent email enumeration
	_ = h.passwordSvc.ForgotPassword(c.Request.Context(), req.Email)

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "ResetLinkSent")})
}

func (h *PasswordHandler) ResetPassword(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	if err := h.passwordSvc.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "PasswordResetSuccess")})
}

func (h *PasswordHandler) VerifyEmail(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidToken")})
		return
	}

	if err := h.passwordSvc.VerifyEmail(c.Request.Context(), token); err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "EmailVerifiedSuccess")})
}
