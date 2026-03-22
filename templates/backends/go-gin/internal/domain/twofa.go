package domain

import "time"

const MaxTwoFAAttempts = 5

type TwoFactorToken struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"-" gorm:"not null;index:idx_2fa_user_used,priority:1"`
	Code       string    `json:"-" gorm:"not null"`
	RememberMe bool      `json:"remember_me" gorm:"default:false"`
	Attempts   int       `json:"-" gorm:"default:0"`
	ExpiresAt  time.Time `json:"expires_at" gorm:"not null;index"`
	Used       bool      `json:"used" gorm:"default:false;index:idx_2fa_user_used,priority:2"`
	CreatedAt  time.Time `json:"created_at"`
	User       User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type RecoveryCode struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"-" gorm:"not null;index"`
	CodeHash  string     `json:"-" gorm:"not null"`
	Used      bool       `json:"used" gorm:"default:false"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
	User      User       `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}
