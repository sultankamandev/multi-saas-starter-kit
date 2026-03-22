package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userSvc *service.UserService
}

func NewUserHandler(userSvc *service.UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	lang := getLang(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	user, err := h.userSvc.GetProfile(c.Request.Context(), userID.(uint))
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "UserProfile"),
		"user":    dto.UserToResponse(user),
	})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	lang := getLang(c)
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": i18n.T(lang, "Unauthorized")})
		return
	}

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	user, err := h.userSvc.UpdateProfile(c.Request.Context(), userID.(uint), req)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "ProfileUpdated"),
		"user":    dto.UserToResponse(user),
	})
}
