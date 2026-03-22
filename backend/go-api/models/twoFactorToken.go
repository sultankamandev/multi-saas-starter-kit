package models

import (
	"time"

	"gorm.io/gorm"
)

// TwoFactorToken stores 2FA verification codes for email-based 2FA
type TwoFactorToken struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"user_id" gorm:"not null;index"`
	Code       string         `json:"code" gorm:"not null;index"`
	RememberMe bool           `json:"remember_me" gorm:"default:false"` // Store Remember Me preference
	ExpiresAt  time.Time      `json:"expires_at" gorm:"not null"`
	Used       bool           `json:"used" gorm:"default:false"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationship
	User User `json:"-" gorm:"foreignKey:UserID"`
}
