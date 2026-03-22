package controllers

import (
	"net/http"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// UserAnalytics represents daily user registration and verification statistics
type UserAnalytics struct {
	Date          string `json:"date"`
	Registrations int    `json:"registrations"`
	Verified      int    `json:"verified"`
}

// GetUserAnalytics returns user analytics grouped by day
// Query parameters:
//   - start_date: Start date in YYYY-MM-DD format (optional, defaults to 30 days ago)
//   - end_date: End date in YYYY-MM-DD format (optional, defaults to today)
func GetUserAnalytics(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	start := c.Query("start_date")
	end := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	// Parse start date or default to 30 days ago
	if start != "" {
		startDate, err = time.Parse("2006-01-02", start)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      utils.T(lang, "InvalidDate"),
				"error_code": "INVALID_START_DATE",
			})
			return
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30) // default: last 30 days
	}

	// Parse end date or default to today
	if end != "" {
		endDate, err = time.Parse("2006-01-02", end)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      utils.T(lang, "InvalidDate"),
				"error_code": "INVALID_END_DATE",
			})
			return
		}
		// Set end date to end of day
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	} else {
		endDate = time.Now()
	}

	// Validate date range
	if startDate.After(endDate) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":      utils.T(lang, "InvalidDateRange"),
			"error_code": "INVALID_DATE_RANGE",
		})
		return
	}

	// Limit date range to prevent excessive queries (max 365 days)
	maxDays := 365
	if endDate.Sub(startDate).Hours() > float64(maxDays*24) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":      utils.T(lang, "DateRangeTooLarge"),
			"error_code": "DATE_RANGE_TOO_LARGE",
		})
		return
	}

	// Extract optional filters
	country := c.Query("country")
	language := c.Query("language")

	var results []UserAnalytics

	// Build dynamic query with optional filters
	query := `
		SELECT 
			TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
			COUNT(*) AS registrations,
			COUNT(*) FILTER (WHERE verified = true) AS verified
		FROM users
		WHERE created_at BETWEEN ? AND ?
			AND deleted_at IS NULL
	`
	args := []interface{}{startDate, endDate}

	if country != "" {
		query += " AND country = ?"
		args = append(args, strings.ToUpper(country))
	}

	if language != "" {
		query += " AND language = ?"
		args = append(args, strings.ToLower(language))
	}

	query += `
		GROUP BY DATE(created_at)
		ORDER BY DATE(created_at) ASC
	`

	err = database.DB.Raw(query, args...).Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, results)
}

