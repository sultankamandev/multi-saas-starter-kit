package domain

import "time"

type LoginEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index:idx_login_events_user_logged,priority:1"`
	IP        string    `json:"ip" gorm:"size:45"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	// DB-level default so a row inserted by another backend that does not set
	// logged_at (e.g. the Python template relies on the column default) still
	// satisfies NOT NULL. All backends target one schema per TEMPLATE_SPEC.
	LoggedAt  time.Time `json:"logged_at" gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_login_events_user_logged,priority:2"`
	CreatedAt time.Time `json:"created_at" gorm:"default:CURRENT_TIMESTAMP"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}
