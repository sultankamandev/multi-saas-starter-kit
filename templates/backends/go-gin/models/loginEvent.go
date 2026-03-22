package models

import (
	"time"

	"gorm.io/gorm"
)

// LoginEvent represents a user login event for tracking active users
type LoginEvent struct {
	gorm.Model
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	IP        string    `json:"ip" gorm:"size:45"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	LoggedAt  time.Time `json:"logged_at" gorm:"not null;index"`
}

