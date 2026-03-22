package models

import (
	"time"

	"gorm.io/gorm"
)

// EmailVerificationToken stores email verification tokens separately from users
// This allows for better audit trail and supports multiple tokens per user
type EmailVerificationToken struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Token     string         `json:"token" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time      `json:"expires_at" gorm:"not null"`
	Used      bool           `json:"used" gorm:"default:false"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationship
	User User `json:"-" gorm:"foreignKey:UserID"`
}
