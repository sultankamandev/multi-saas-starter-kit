package domain

import "time"

type LoginEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index:idx_login_events_user_logged,priority:1"`
	IP        string    `json:"ip" gorm:"size:45"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	LoggedAt  time.Time `json:"logged_at" gorm:"not null;index:idx_login_events_user_logged,priority:2"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}
