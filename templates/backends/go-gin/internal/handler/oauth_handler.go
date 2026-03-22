package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type OAuthHandler struct {
	oauthSvc *service.OAuthService
}

func NewOAuthHandler(oauthSvc *service.OAuthService) *OAuthHandler {
	return &OAuthHandler{oauthSvc: oauthSvc}
}

func (h *OAuthHandler) GoogleLogin(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.oauthSvc.GoogleLogin(c.Request.Context(), req.Token, req.RememberMe, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		writeError(c, err)
		return
	}

	if result.Requires2FA {
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"two_fa_type":  result.TwoFAType,
			"user_id":      result.User.ID,
			"message":      i18n.T(lang, "TOTPCodeRequired"),
		})
		return
	}

	c.JSON(http.StatusOK, dto.LoginResponse{
		Message:      i18n.T(lang, "GoogleLoginSuccess"),
		User:         dto.UserToResponse(result.User),
		AccessToken:  result.TokenPair.AccessToken,
		RefreshToken: result.TokenPair.RefreshToken,
		ExpiresIn:    result.TokenPair.ExpiresIn,
		TokenType:    result.TokenPair.TokenType,
	})
}
