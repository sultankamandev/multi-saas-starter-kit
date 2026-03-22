package controllers

import (
	"net/http"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// RetentionStats represents retention statistics for a cohort (signup date)
type RetentionStats struct {
	SignupDate     string  `json:"signup_date"`
	NewUsers       int     `json:"new_users"`
	Retained7d     int     `json:"retained_7d"`
	Retained30d    int     `json:"retained_30d"`
	Retention7Rate float64 `json:"retention_7_rate"`
	Retention30Rate float64 `json:"retention_30_rate"`
}

// RetentionAnalyticsResponse represents the response for retention analytics
type RetentionAnalyticsResponse struct {
	RetentionData []RetentionStats `json:"retention_data"`
	Average7d     float64          `json:"average_7d"`
	Average30d    float64          `json:"average_30d"`
}

// GetUserRetentionAnalytics calculates 7-day and 30-day user retention rates by cohort
// Query parameters:
//   - start_date: Start date in YYYY-MM-DD format (optional, defaults to 60 days ago)
//   - end_date: End date in YYYY-MM-DD format (optional, defaults to today)
func GetUserRetentionAnalytics(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	start := c.Query("start_date")
	end := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	// Parse start date or default to 60 days ago (for retention we need more history)
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
		startDate = time.Now().AddDate(0, 0, -60) // default: last 60 days
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

	var results []RetentionStats

	// Build dynamic query with optional filters
	cohortsWhere := "created_at BETWEEN ? AND ? AND deleted_at IS NULL"
	args := []interface{}{startDate, endDate}

	if country != "" {
		cohortsWhere += " AND country = ?"
		args = append(args, strings.ToUpper(country))
	}

	if language != "" {
		cohortsWhere += " AND language = ?"
		args = append(args, strings.ToLower(language))
	}

	// Use PostgreSQL CTE (Common Table Expression) for efficient retention calculation
	query := `
		WITH cohorts AS (
			SELECT 
				id AS user_id, 
				DATE(created_at) AS signup_date
			FROM users
			WHERE ` + cohortsWhere + `
		),
		login_7 AS (
			SELECT DISTINCT le.user_id
			FROM login_events le
			INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at BETWEEN c.signup_date AND c.signup_date + INTERVAL '7 days'
				AND le.deleted_at IS NULL
		),
		login_30 AS (
			SELECT DISTINCT le.user_id
			FROM login_events le
			INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at BETWEEN c.signup_date AND c.signup_date + INTERVAL '30 days'
				AND le.deleted_at IS NULL
		)
		SELECT 
			TO_CHAR(c.signup_date, 'YYYY-MM-DD') AS signup_date,
			COUNT(c.user_id) AS new_users,
			COUNT(DISTINCT l7.user_id) AS retained_7d,
			COUNT(DISTINCT l30.user_id) AS retained_30d,
			CASE 
				WHEN COUNT(c.user_id) > 0 
				THEN ROUND(COUNT(DISTINCT l7.user_id)::decimal / COUNT(c.user_id) * 100, 2) 
				ELSE 0 
			END AS retention_7_rate,
			CASE 
				WHEN COUNT(c.user_id) > 0 
				THEN ROUND(COUNT(DISTINCT l30.user_id)::decimal / COUNT(c.user_id) * 100, 2) 
				ELSE 0 
			END AS retention_30_rate
		FROM cohorts c
		LEFT JOIN login_7 l7 ON l7.user_id = c.user_id
		LEFT JOIN login_30 l30 ON l30.user_id = c.user_id
		GROUP BY c.signup_date
		ORDER BY c.signup_date ASC
	`
	err = database.DB.Raw(query, args...).Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}

	// Calculate average retention rates
	var avg7, avg30 float64
	totalDays := 0

	for _, r := range results {
		if r.NewUsers > 0 { // Only include cohorts with users
			avg7 += r.Retention7Rate
			avg30 += r.Retention30Rate
			totalDays++
		}
	}

	if totalDays > 0 {
		avg7 /= float64(totalDays)
		avg30 /= float64(totalDays)
	}

	response := RetentionAnalyticsResponse{
		RetentionData: results,
		Average7d:     avg7,
		Average30d:    avg30,
	}

	c.JSON(http.StatusOK, response)
}

