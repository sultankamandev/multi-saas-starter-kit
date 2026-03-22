package models

import (
	"time"

	"gorm.io/gorm"
)

// RecoveryCode stores one-time recovery codes for 2FA backup access
type RecoveryCode struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	CodeHash  string         `json:"-" gorm:"not null"` // Hashed code (like passwords)
	Used      bool           `json:"used" gorm:"default:false"`
	UsedAt    *time.Time     `json:"used_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationship
	User User `json:"-" gorm:"foreignKey:UserID"`
}
