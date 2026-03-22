package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

func (h *AuthHandler) Register(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.authSvc.Register(c.Request.Context(), req, c.ClientIP())
	if err != nil {
		writeError(c, err)
		return
	}

	msg := i18n.T(lang, "UserRegisteredSuccess")
	if result.VerificationRequired {
		msg = i18n.T(lang, "UserRegisteredPleaseVerify")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": msg,
		"user":    dto.UserToResponse(result.User),
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	lang := getLang(c)

	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidRequest")})
		return
	}

	result, err := h.authSvc.Login(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.LoginResponse{
		Message:      i18n.T(lang, "LoginSuccess"),
		User:         dto.UserToResponse(result.User),
		AccessToken:  result.TokenPair.AccessToken,
		RefreshToken: result.TokenPair.RefreshToken,
		ExpiresIn:    result.TokenPair.ExpiresIn,
		TokenType:    result.TokenPair.TokenType,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	lang := getLang(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	user, err := h.authSvc.GetMe(c.Request.Context(), userID.(uint))
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": dto.UserToResponse(user)})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	result, err := h.authSvc.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	lang := extractLanguageFromBody(c)

	var req dto.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	_ = h.authSvc.Logout(c.Request.Context(), req.RefreshToken)

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "LoggedOutSuccess")})
}

func (h *AuthHandler) LogoutAllSessions(c *gin.Context) {
	lang := getLang(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	if err := h.authSvc.LogoutAllSessions(c.Request.Context(), userID.(uint)); err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all sessions revoked"})
}

func (h *AuthHandler) Dashboard(c *gin.Context) {
	lang := getLang(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	user, err := h.authSvc.GetMe(c.Request.Context(), userID.(uint))
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "WelcomeDashboard"),
		"user":    dto.UserToResponse(user),
		"dashboard": gin.H{
			"title": i18n.T(lang, "DashboardTitle"),
			"features": []string{
				i18n.T(lang, "ViewProfile"),
				i18n.T(lang, "UpdatePersonalInfo"),
				i18n.T(lang, "AccessAppFeatures"),
			},
		},
	})
}
