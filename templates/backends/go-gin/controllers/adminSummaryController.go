package controllers

import (
	"net/http"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// AdminSummary represents KPI summary data for the admin dashboard
type AdminSummary struct {
	TotalUsers     int     `json:"total_users"`
	VerifiedUsers  int     `json:"verified_users"`
	NewUsers7Days  int     `json:"new_users_7_days"`
	VerifiedPercent float64 `json:"verified_percent"`
}

// GetAdminSummary returns KPI summary data for the admin dashboard
// Returns:
//   - total_users: Total number of registered users (excluding deleted)
//   - verified_users: Number of verified users
//   - new_users_7_days: Number of users registered in the last 7 days
//   - verified_percent: Percentage of verified users
func GetAdminSummary(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	// Extract optional filters
	country := c.Query("country")
	language := c.Query("language")

	var result AdminSummary

	// Build query with optional filters
	query := database.DB.Model(&models.User{})

	if country != "" {
		query = query.Where("country = ?", strings.ToUpper(country))
	}

	if language != "" {
		query = query.Where("language = ?", strings.ToLower(language))
	}

	// Total users (excluding soft-deleted)
	var totalUsers int64
	if err := query.Count(&totalUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}
	result.TotalUsers = int(totalUsers)

	// Verified users (excluding soft-deleted)
	verifiedQuery := database.DB.Model(&models.User{}).Where("verified = ?", true)
	if country != "" {
		verifiedQuery = verifiedQuery.Where("country = ?", strings.ToUpper(country))
	}
	if language != "" {
		verifiedQuery = verifiedQuery.Where("language = ?", strings.ToLower(language))
	}
	var verifiedUsers int64
	if err := verifiedQuery.Count(&verifiedUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}
	result.VerifiedUsers = int(verifiedUsers)

	// New users in last 7 days (excluding soft-deleted)
	weekAgo := time.Now().AddDate(0, 0, -7)
	newUsersQuery := database.DB.Model(&models.User{}).Where("created_at >= ?", weekAgo)
	if country != "" {
		newUsersQuery = newUsersQuery.Where("country = ?", strings.ToUpper(country))
	}
	if language != "" {
		newUsersQuery = newUsersQuery.Where("language = ?", strings.ToLower(language))
	}
	var newUsers7Days int64
	if err := newUsersQuery.Count(&newUsers7Days).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}
	result.NewUsers7Days = int(newUsers7Days)

	// Calculate verified percentage
	if result.TotalUsers > 0 {
		result.VerifiedPercent = float64(result.VerifiedUsers) / float64(result.TotalUsers) * 100
	}

	c.JSON(http.StatusOK, result)
}

