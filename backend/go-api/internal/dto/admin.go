package dto

type AdminCreateUserRequest struct {
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8,max=255"`
	Role      string `json:"role"`
	Language  string `json:"language"`
	Verified  *bool  `json:"verified"`
}

type AdminUpdateUserRequest struct {
	Username     string `json:"username"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email" binding:"omitempty,email"`
	Password     string `json:"password" binding:"omitempty,min=8,max=255"`
	Role         string `json:"role"`
	Language     string `json:"language"`
	Country      string `json:"country"`
	Address      string `json:"address"`
	Phone        string `json:"phone"`
	Verified     *bool  `json:"verified"`
	TwoFAEnabled *bool  `json:"two_fa_enabled"`
}

type AdminUpdateRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=admin user"`
}

type UserListParams struct {
	Page        int
	Limit       int
	SortField   string
	SortOrder   string
	SearchQuery string
}

type AdminSummary struct {
	TotalUsers      int     `json:"total_users"`
	VerifiedUsers   int     `json:"verified_users"`
	NewUsers7Days   int     `json:"new_users_7_days"`
	VerifiedPercent float64 `json:"verified_percent"`
}

type UserAnalytics struct {
	Date          string `json:"date"`
	Registrations int    `json:"registrations"`
	Verified      int    `json:"verified"`
}

type ActiveUserStats struct {
	Date        string `json:"date"`
	ActiveUsers int    `json:"active_users"`
}

type ActiveUserAnalyticsResponse struct {
	Daily     []ActiveUserStats `json:"daily"`
	Active24h int64             `json:"active_24h"`
	Active7d  int64             `json:"active_7d"`
}

type RetentionStats struct {
	SignupDate      string  `json:"signup_date"`
	NewUsers        int     `json:"new_users"`
	Retained7d      int     `json:"retained_7d"`
	Retained30d     int     `json:"retained_30d"`
	Retention7Rate  float64 `json:"retention_7_rate"`
	Retention30Rate float64 `json:"retention_30_rate"`
}

type RetentionAnalyticsResponse struct {
	RetentionData []RetentionStats `json:"retention_data"`
	Average7d     float64          `json:"average_7d"`
	Average30d    float64          `json:"average_30d"`
}

type CohortRow struct {
	SignupDate string  `json:"signup_date"`
	NewUsers   int     `json:"new_users"`
	Day1       float64 `json:"day_1"`
	Day3       float64 `json:"day_3"`
	Day7       float64 `json:"day_7"`
	Day14      float64 `json:"day_14"`
	Day30      float64 `json:"day_30"`
}

type AnalyticsFilter struct {
	StartDate string
	EndDate   string
	Country   string
	Language  string
}
