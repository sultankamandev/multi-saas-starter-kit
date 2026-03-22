package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type AdminUserHandler struct {
	adminSvc *service.AdminUserService
}

func NewAdminUserHandler(adminSvc *service.AdminUserService) *AdminUserHandler {
	return &AdminUserHandler{adminSvc: adminSvc}
}

func (h *AdminUserHandler) List(c *gin.Context) {
	lang := getLang(c)

	page, _ := strconv.Atoi(c.DefaultQuery("_page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("_limit", "10"))
	if page < 1 { page = 1 }
	if limit < 1 { limit = 10 }

	params := dto.UserListParams{
		Page:        page,
		Limit:       limit,
		SortField:   c.DefaultQuery("_sort", "id"),
		SortOrder:   c.DefaultQuery("_order", "asc"),
		SearchQuery: c.Query("q"),
	}

	users, total, err := h.adminSvc.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.Header("X-Total-Count", fmt.Sprintf("%d", total))
	c.Header("Access-Control-Expose-Headers", "X-Total-Count")
	c.JSON(http.StatusOK, dto.UsersToResponse(users))
}

func (h *AdminUserHandler) Get(c *gin.Context) {
	lang := getLang(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidRequest")})
		return
	}

	user, err := h.adminSvc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "UserFound"),
		"user":    dto.UserToResponse(user),
	})
}

func (h *AdminUserHandler) Create(c *gin.Context) {
	lang := getLang(c)

	var req dto.AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	adminID, _ := c.Get("userID")
	user, err := h.adminSvc.Create(c.Request.Context(), adminID.(uint), req)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": i18n.T(lang, "UserCreated"),
		"user":    dto.UserToResponse(user),
	})
}

func (h *AdminUserHandler) Update(c *gin.Context) {
	lang := getLang(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidRequest")})
		return
	}

	var req dto.AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	adminID, _ := c.Get("userID")
	user, err := h.adminSvc.Update(c.Request.Context(), adminID.(uint), uint(id), req)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "UserUpdated"),
		"user":    dto.UserToResponse(user),
	})
}

func (h *AdminUserHandler) Delete(c *gin.Context) {
	lang := getLang(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidRequest")})
		return
	}

	adminID, _ := c.Get("userID")
	if err := h.adminSvc.Delete(c.Request.Context(), adminID.(uint), uint(id)); err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "UserDeleted")})
}

func (h *AdminUserHandler) UpdateRole(c *gin.Context) {
	lang := getLang(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidRequest")})
		return
	}

	var req dto.AdminUpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errors": formatValidationErrors(err, lang)})
		return
	}

	adminID, _ := c.Get("userID")
	user, err := h.adminSvc.UpdateRole(c.Request.Context(), adminID.(uint), uint(id), req.Role)
	if err != nil {
		writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "UserRoleUpdated"),
		"user":    dto.UserToResponse(user),
	})
}

func (h *AdminUserHandler) Stats(c *gin.Context) {
	lang := getLang(c)

	stats, err := h.adminSvc.Stats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "AdminStats"),
		"stats":   stats,
	})
}

func (h *AdminUserHandler) GetActions(c *gin.Context) {
	lang := getLang(c)
	page, _ := strconv.Atoi(c.DefaultQuery("_page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("_limit", "50"))
	if page < 1 { page = 1 }
	if limit < 1 { limit = 50 }

	actions, total, err := h.adminSvc.GetActions(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}

	c.Header("X-Total-Count", fmt.Sprintf("%d", total))
	c.Header("Access-Control-Expose-Headers", "X-Total-Count")
	c.JSON(http.StatusOK, actions)
}
