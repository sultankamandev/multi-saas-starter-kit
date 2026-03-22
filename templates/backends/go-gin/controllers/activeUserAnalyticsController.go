package controllers

import (
	"net/http"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// ActiveUserStats represents daily active user statistics
type ActiveUserStats struct {
	Date        string `json:"date"`
	ActiveUsers int    `json:"active_users"`
}

// ActiveUserAnalyticsResponse represents the response for active user analytics
type ActiveUserAnalyticsResponse struct {
	Daily     []ActiveUserStats `json:"daily"`
	Active24h int64             `json:"active_24h"`
	Active7d  int64             `json:"active_7d"`
}

// GetActiveUserAnalytics returns active user analytics grouped by day
// Query parameters:
//   - start_date: Start date in YYYY-MM-DD format (optional, defaults to 30 days ago)
//   - end_date: End date in YYYY-MM-DD format (optional, defaults to today)
func GetActiveUserAnalytics(c *gin.Context) {
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

	var results []ActiveUserStats

	// Build dynamic query with optional filters
	// Join with users table to filter by country/language
	query := `
		SELECT 
			TO_CHAR(DATE(le.logged_at), 'YYYY-MM-DD') AS date,
			COUNT(DISTINCT le.user_id) AS active_users
		FROM login_events le
		INNER JOIN users u ON u.id = le.user_id
		WHERE le.logged_at BETWEEN ? AND ?
			AND le.deleted_at IS NULL
			AND u.deleted_at IS NULL
	`
	args := []interface{}{startDate, endDate}

	if country != "" {
		query += " AND u.country = ?"
		args = append(args, strings.ToUpper(country))
	}

	if language != "" {
		query += " AND u.language = ?"
		args = append(args, strings.ToLower(language))
	}

	query += `
		GROUP BY DATE(le.logged_at)
		ORDER BY DATE(le.logged_at) ASC
	`

	err = database.DB.Raw(query, args...).Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}

	// Calculate additional KPIs: Active users in last 24 hours and last 7 days
	var active24h int64
	var active7d int64

	yesterday := time.Now().Add(-24 * time.Hour)
	weekAgo := time.Now().AddDate(0, 0, -7)

	// Build filter conditions for 24h and 7d queries
	filterConditions := ""
	filterArgs := []interface{}{}
	if country != "" {
		filterConditions += " AND u.country = ?"
		filterArgs = append(filterArgs, strings.ToUpper(country))
	}
	if language != "" {
		filterConditions += " AND u.language = ?"
		filterArgs = append(filterArgs, strings.ToLower(language))
	}

	// Count distinct active users in last 24 hours using raw SQL
	err = database.DB.Raw(`
		SELECT COUNT(DISTINCT le.user_id)
		FROM login_events le
		INNER JOIN users u ON u.id = le.user_id
		WHERE le.logged_at >= ? 
			AND le.deleted_at IS NULL
			AND u.deleted_at IS NULL
			`+filterConditions+`
	`, append([]interface{}{yesterday}, filterArgs...)...).Scan(&active24h).Error
	if err != nil {
		// If query fails, set to 0 and continue (don't fail entire request)
		active24h = 0
	}

	// Count distinct active users in last 7 days using raw SQL
	err = database.DB.Raw(`
		SELECT COUNT(DISTINCT le.user_id)
		FROM login_events le
		INNER JOIN users u ON u.id = le.user_id
		WHERE le.logged_at >= ? 
			AND le.deleted_at IS NULL
			AND u.deleted_at IS NULL
			`+filterConditions+`
	`, append([]interface{}{weekAgo}, filterArgs...)...).Scan(&active7d).Error
	if err != nil {
		// If query fails, set to 0 and continue (don't fail entire request)
		active7d = 0
	}

	response := ActiveUserAnalyticsResponse{
		Daily:     results,
		Active24h: active24h,
		Active7d:  active7d,
	}

	c.JSON(http.StatusOK, response)
}

