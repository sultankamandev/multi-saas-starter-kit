package repository

import (
	"context"
	"strings"
	"time"

	"saas-starter/backend/go-api/internal/dto"
	"saas-starter/backend/go-api/internal/platform/database"

	"gorm.io/gorm"
)

type analyticsRepo struct {
	db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) AnalyticsRepository {
	return &analyticsRepo{db: db}
}

func (r *analyticsRepo) conn(ctx context.Context) *gorm.DB {
	return database.DBFromContext(ctx, r.db)
}

func (r *analyticsRepo) parseFilter(filter dto.AnalyticsFilter) (startDate, endDate time.Time, err error) {
	if filter.StartDate != "" {
		startDate, err = time.Parse("2006-01-02", filter.StartDate)
		if err != nil {
			return
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30)
	}

	if filter.EndDate != "" {
		endDate, err = time.Parse("2006-01-02", filter.EndDate)
		if err != nil {
			return
		}
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	} else {
		endDate = time.Now()
	}
	return
}

func appendFilters(query string, args []interface{}, filter dto.AnalyticsFilter, tablePrefix string) (string, []interface{}) {
	if filter.Country != "" {
		query += " AND " + tablePrefix + "country = ?"
		args = append(args, strings.ToUpper(filter.Country))
	}
	if filter.Language != "" {
		query += " AND " + tablePrefix + "language = ?"
		args = append(args, strings.ToLower(filter.Language))
	}
	return query, args
}

func (r *analyticsRepo) UserRegistrationsByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.UserAnalytics, error) {
	startDate, endDate, err := r.parseFilter(filter)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT 
			TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
			COUNT(*) AS registrations,
			COUNT(*) FILTER (WHERE verified = true) AS verified
		FROM users
		WHERE created_at BETWEEN ? AND ? AND deleted_at IS NULL
	`
	args := []interface{}{startDate, endDate}
	query, args = appendFilters(query, args, filter, "")
	query += " GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC"

	var results []dto.UserAnalytics
	if err := r.conn(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *analyticsRepo) ActiveUsersByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.ActiveUserStats, error) {
	startDate, endDate, err := r.parseFilter(filter)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT 
			TO_CHAR(DATE(le.logged_at), 'YYYY-MM-DD') AS date,
			COUNT(DISTINCT le.user_id) AS active_users
		FROM login_events le
		INNER JOIN users u ON u.id = le.user_id
		WHERE le.logged_at BETWEEN ? AND ? AND u.deleted_at IS NULL
	`
	args := []interface{}{startDate, endDate}
	query, args = appendFilters(query, args, filter, "u.")
	query += " GROUP BY DATE(le.logged_at) ORDER BY DATE(le.logged_at) ASC"

	var results []dto.ActiveUserStats
	if err := r.conn(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *analyticsRepo) ActiveUsersCount(ctx context.Context, since time.Time, filter dto.AnalyticsFilter) (int64, error) {
	query := `
		SELECT COUNT(DISTINCT le.user_id)
		FROM login_events le
		INNER JOIN users u ON u.id = le.user_id
		WHERE le.logged_at >= ? AND u.deleted_at IS NULL
	`
	args := []interface{}{since}
	query, args = appendFilters(query, args, filter, "u.")

	var count int64
	if err := r.conn(ctx).Raw(query, args...).Scan(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *analyticsRepo) RetentionByDay(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.RetentionStats, error) {
	startDate, endDate, err := r.parseFilter(filter)
	if err != nil {
		return nil, err
	}

	cohortsWhere := "created_at BETWEEN ? AND ? AND deleted_at IS NULL"
	args := []interface{}{startDate, endDate}
	cohortsWhere, args = appendFilters(cohortsWhere, args, filter, "")

	query := `
		WITH cohorts AS (
			SELECT id AS user_id, DATE(created_at) AS signup_date
			FROM users WHERE ` + cohortsWhere + `
		),
		login_7 AS (
			SELECT DISTINCT le.user_id FROM login_events le
			INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at BETWEEN c.signup_date AND c.signup_date + INTERVAL '7 days'
		),
		login_30 AS (
			SELECT DISTINCT le.user_id FROM login_events le
			INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at BETWEEN c.signup_date AND c.signup_date + INTERVAL '30 days'
		)
		SELECT 
			TO_CHAR(c.signup_date, 'YYYY-MM-DD') AS signup_date,
			COUNT(c.user_id) AS new_users,
			COUNT(DISTINCT l7.user_id) AS retained_7d,
			COUNT(DISTINCT l30.user_id) AS retained_30d,
			CASE WHEN COUNT(c.user_id) > 0 THEN ROUND(COUNT(DISTINCT l7.user_id)::decimal / COUNT(c.user_id) * 100, 2) ELSE 0 END AS retention_7_rate,
			CASE WHEN COUNT(c.user_id) > 0 THEN ROUND(COUNT(DISTINCT l30.user_id)::decimal / COUNT(c.user_id) * 100, 2) ELSE 0 END AS retention_30_rate
		FROM cohorts c
		LEFT JOIN login_7 l7 ON l7.user_id = c.user_id
		LEFT JOIN login_30 l30 ON l30.user_id = c.user_id
		GROUP BY c.signup_date ORDER BY c.signup_date ASC
	`

	var results []dto.RetentionStats
	if err := r.conn(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *analyticsRepo) CohortRetention(ctx context.Context, filter dto.AnalyticsFilter) ([]dto.CohortRow, error) {
	startDate, endDate, err := r.parseFilter(filter)
	if err != nil {
		return nil, err
	}

	var whereClauses []string
	args := []interface{}{startDate, endDate}
	whereClauses = append(whereClauses, "created_at BETWEEN ? AND ?", "deleted_at IS NULL")
	if filter.Country != "" {
		whereClauses = append(whereClauses, "country = ?")
		args = append(args, strings.ToUpper(filter.Country))
	}
	if filter.Language != "" {
		whereClauses = append(whereClauses, "language = ?")
		args = append(args, strings.ToLower(filter.Language))
	}
	cohortsWhere := strings.Join(whereClauses, " AND ")

	query := `
		WITH cohorts AS (
			SELECT id AS user_id, DATE(created_at) AS signup_date FROM users WHERE ` + cohortsWhere + `
		),
		logins AS (
			SELECT c.signup_date, le.user_id, (le.logged_at::date - c.signup_date) AS days_after_signup
			FROM login_events le INNER JOIN cohorts c ON c.user_id = le.user_id
			WHERE le.logged_at > c.signup_date
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
		GROUP BY c.signup_date ORDER BY c.signup_date ASC
	`

	var results []dto.CohortRow
	if err := r.conn(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *analyticsRepo) SummaryStats(ctx context.Context, filter dto.AnalyticsFilter) (*dto.AdminSummary, error) {
	db := r.conn(ctx)
	var summary dto.AdminSummary

	totalQ := db.Model(&struct{}{}).Table("users").Where("deleted_at IS NULL")
	verifiedQ := db.Model(&struct{}{}).Table("users").Where("deleted_at IS NULL AND verified = true")
	newQ := db.Model(&struct{}{}).Table("users").Where("deleted_at IS NULL AND created_at >= ?", time.Now().AddDate(0, 0, -7))

	if filter.Country != "" {
		c := strings.ToUpper(filter.Country)
		totalQ = totalQ.Where("country = ?", c)
		verifiedQ = verifiedQ.Where("country = ?", c)
		newQ = newQ.Where("country = ?", c)
	}
	if filter.Language != "" {
		l := strings.ToLower(filter.Language)
		totalQ = totalQ.Where("language = ?", l)
		verifiedQ = verifiedQ.Where("language = ?", l)
		newQ = newQ.Where("language = ?", l)
	}

	var total, verified, newUsers int64
	totalQ.Count(&total)
	verifiedQ.Count(&verified)
	newQ.Count(&newUsers)

	summary.TotalUsers = int(total)
	summary.VerifiedUsers = int(verified)
	summary.NewUsers7Days = int(newUsers)
	if total > 0 {
		summary.VerifiedPercent = float64(verified) / float64(total) * 100
	}

	return &summary, nil
}
