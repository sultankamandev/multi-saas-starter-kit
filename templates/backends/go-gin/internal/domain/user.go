package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uint           `json:"-" gorm:"primaryKey"`
	PublicID     string         `json:"id" gorm:"column:public_id;type:uuid;uniqueIndex;not null"`
	Username     string         `json:"username" gorm:"column:username;uniqueIndex:idx_users_username_lower;size:30"`
	FirstName    string         `json:"first_name" gorm:"size:100"`
	LastName     string         `json:"last_name" gorm:"size:100"`
	Email        string         `json:"email" gorm:"uniqueIndex:idx_users_email_lower;not null;size:255"`
	PasswordHash string         `json:"-" gorm:"column:password_hash;not null"`
	Role         string         `json:"role" gorm:"type:varchar(20);default:'user';not null"`
	Verified     bool           `json:"verified" gorm:"default:false"`
	TwoFAEnabled bool           `json:"two_fa_enabled" gorm:"default:false"`
	TwoFASecret  string         `json:"-" gorm:"column:two_fa_secret"`
	Language     string         `json:"language" gorm:"size:5;default:'en'"`
	Country      string         `json:"country" gorm:"size:10"`
	Address      string         `json:"address" gorm:"size:500"`
	Phone        string         `json:"phone" gorm:"size:30"`
	CreatedAt    time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.PublicID == "" {
		u.PublicID = uuid.Must(uuid.NewV7()).String()
	}
	return nil
}

func (u *User) FullName() string {
	if u.FirstName == "" && u.LastName == "" {
		return "User"
	}
	if u.LastName != "" {
		return fmt.Sprintf("%s %s", u.FirstName, u.LastName)
	}
	return u.FirstName
}

func (u *User) PreferredLang(fallback string) string {
	if u.Language != "" {
		return u.Language
	}
	if fallback != "" {
		return fallback
	}
	return "en"
}
