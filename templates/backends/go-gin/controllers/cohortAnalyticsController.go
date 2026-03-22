package controllers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// CohortRow represents cohort retention data for a specific signup date
type CohortRow struct {
	SignupDate string  `json:"signup_date"`
	NewUsers   int     `json:"new_users"`
	Day1       float64 `json:"day_1"`
	Day3       float64 `json:"day_3"`
	Day7       float64 `json:"day_7"`
	Day14      float64 `json:"day_14"`
	Day30      float64 `json:"day_30"`
}

// GetCohortAnalytics returns cohort-based retention analytics
// Query parameters:
//   - start_date: Start date in YYYY-MM-DD format (optional, defaults to 60 days ago)
//   - end_date: End date in YYYY-MM-DD format (optional, defaults to today)
//
// Returns retention percentages for days 1, 3, 7, 14, and 30 for each signup cohort
func GetCohortAnalytics(c *gin.Context) {
	lang := c.MustGet("lang").(string)

	start := c.Query("start_date")
	end := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	// Parse start date or default to 60 days ago (for cohort analysis we need more history)
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

	var cohorts []CohortRow

	// Build dynamic WHERE clause with optional filters
	var whereClauses []string
	args := []interface{}{startDate, endDate}
	whereClauses = append(whereClauses, "created_at BETWEEN ? AND ?")
	whereClauses = append(whereClauses, "deleted_at IS NULL")

	if country != "" {
		whereClauses = append(whereClauses, "country = ?")
		args = append(args, strings.ToUpper(country))
	}

	if language != "" {
		whereClauses = append(whereClauses, "language = ?")
		args = append(args, strings.ToLower(language))
	}

	cohortsWhere := strings.Join(whereClauses, " AND ")

	// Use PostgreSQL CTE for efficient cohort retention calculation
	// This query calculates what percentage of users from each cohort logged in during specific day ranges
	query := `
		WITH cohorts AS (
			SELECT 
				id AS user_id, 
				DATE(created_at) AS signup_date
			FROM users
			WHERE ` + cohortsWhere + `
		),
		logins AS (
			SELECT 
				c.signup_date,
				le.user_id,
				(le.logged_at::date - c.signup_date) AS days_after_signup
			FROM login_events le
			INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at > c.signup_date
				AND le.deleted_at IS NULL
		)
		SELECT 
			TO_CHAR(c.signup_date, 'YYYY-MM-DD') AS signup_date,
			COUNT(DISTINCT c.user_id) AS new_users,
			COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.days_after_signup BETWEEN 1 AND 1 THEN l.user_id END)::decimal / NULLIF(COUNT(DISTINCT c.user_id), 0), 1), 0) AS day_1,
			COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.days_after_signup BETWEEN 2 AND 3 THEN l.user_id END)::decimal / NULLIF(COUNT(DISTINCT c.user_id), 0), 1), 0) AS day_3,
			COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.days_after_signup BETWEEN 4 AND 7 THEN l.user_id END)::decimal / NULLIF(COUNT(DISTINCT c.user_id), 0), 1), 0) AS day_7,
			COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.days_after_signup BETWEEN 8 AND 14 THEN l.user_id END)::decimal / NULLIF(COUNT(DISTINCT c.user_id), 0), 1), 0) AS day_14,
			COALESCE(ROUND(100.0 * COUNT(DISTINCT CASE WHEN l.days_after_signup BETWEEN 15 AND 30 THEN l.user_id END)::decimal / NULLIF(COUNT(DISTINCT c.user_id), 0), 1), 0) AS day_30
		FROM cohorts c
		LEFT JOIN logins l ON l.signup_date = c.signup_date AND l.user_id = c.user_id
		GROUP BY c.signup_date
		ORDER BY c.signup_date ASC
	`

	err = database.DB.Raw(query, args...).Scan(&cohorts).Error

	if err != nil {
		log.Printf("❌ Cohort analytics database error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      utils.T(lang, "DatabaseError"),
			"error_code": "DATABASE_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, cohorts)
}
