package handler

import (
	"net/http"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/service"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type AdminAnalyticsHandler struct {
	analyticsSvc *service.AnalyticsService
}

func NewAdminAnalyticsHandler(analyticsSvc *service.AnalyticsService) *AdminAnalyticsHandler {
	return &AdminAnalyticsHandler{analyticsSvc: analyticsSvc}
}

func (h *AdminAnalyticsHandler) extractFilter(c *gin.Context) dto.AnalyticsFilter {
	return dto.AnalyticsFilter{
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Country:   c.Query("country"),
		Language:  c.Query("language"),
	}
}

func (h *AdminAnalyticsHandler) UserRegistrations(c *gin.Context) {
	lang := getLang(c)
	result, err := h.analyticsSvc.UserRegistrations(c.Request.Context(), h.extractFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AdminAnalyticsHandler) ActiveUsers(c *gin.Context) {
	lang := getLang(c)
	result, err := h.analyticsSvc.ActiveUsers(c.Request.Context(), h.extractFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AdminAnalyticsHandler) Retention(c *gin.Context) {
	lang := getLang(c)
	result, err := h.analyticsSvc.Retention(c.Request.Context(), h.extractFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AdminAnalyticsHandler) Cohort(c *gin.Context) {
	lang := getLang(c)
	result, err := h.analyticsSvc.CohortRetention(c.Request.Context(), h.extractFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AdminAnalyticsHandler) Summary(c *gin.Context) {
	lang := getLang(c)
	result, err := h.analyticsSvc.Summary(c.Request.Context(), h.extractFilter(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
		return
	}
	c.JSON(http.StatusOK, result)
}
