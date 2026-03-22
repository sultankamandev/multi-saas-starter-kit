package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"column:username;unique;size:30;index"` // Unique username (case-insensitive via application logic)
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email" gorm:"unique;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	Role         string    `json:"role" gorm:"default:'user'"`
	Verified     bool      `json:"verified" gorm:"default:false"`
	TwoFAEnabled bool      `json:"two_fa_enabled" gorm:"default:false"`
	TwoFASecret  string    `json:"-" gorm:"column:two_fa_secret"`
	Language     string    `json:"language" gorm:"default:'en'"`
	Country      string    `json:"country" gorm:"size:10"` // ISO country code (e.g., "TR", "US", "GB")
	Address      string    `json:"address"`
	Phone        string    `json:"phone"`
	// Reset password fields
	ResetToken    string         `json:"-" gorm:"column:reset_token"`
	ResetTokenExp time.Time      `json:"-" gorm:"column:reset_token_exp"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

type UserResponse struct {
	ID           uint      `json:"id"`
	Username     string    `json:"username"` // Username (may be empty for older users, but always include in response)
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	Language     string    `json:"language"`
	Country      string    `json:"country,omitempty"` // ISO country code (e.g., "TR", "US", "GB")
	Address      string    `json:"address,omitempty"`
	Phone        string    `json:"phone,omitempty"`
	Verified     bool      `json:"verified"`
	TwoFAEnabled bool      `json:"two_fa_enabled"` // Whether 2FA is enabled for this user
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type LoginRequest struct {
	EmailOrUsername string `json:"email_or_username" binding:"required"` // Can be email or username
	Password        string `json:"password" binding:"required"`
	RecaptchaToken  string `json:"recaptcha_token"` // Optional reCAPTCHA token
	RememberMe      bool   `json:"remember_me"`
}

type RegisterRequest struct {
	Username       string `json:"username" binding:"required"` // Username (required, validated separately)
	FirstName      string `json:"first_name" binding:"required"`
	LastName       string `json:"last_name" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8,max=255"`
	RecaptchaToken string `json:"recaptcha_token"` // Optional reCAPTCHA token
	Role           string `json:"role,omitempty"`
	Language       string `json:"language,omitempty"`
	Country        string `json:"country,omitempty"` // ISO country code (e.g., "TR", "US", "GB")
}
