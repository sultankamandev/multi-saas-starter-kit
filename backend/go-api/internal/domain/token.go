package domain

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

type RefreshToken struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"-" gorm:"not null;index:idx_refresh_tokens_active"`
	TokenHash string    `json:"-" gorm:"column:token_hash;uniqueIndex;not null"`
	FamilyID  string    `json:"-" gorm:"column:family_id;index;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	Revoked   bool      `json:"revoked" gorm:"default:false;index:idx_refresh_tokens_active"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type PasswordResetToken struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"-" gorm:"not null;index"`
	Token     string    `json:"-" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type EmailVerificationToken struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"-" gorm:"not null;index"`
	Token     string    `json:"-" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null;index"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// HashToken produces a SHA-256 hex digest of a raw token string.
func HashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// MustGenerateSecureToken creates a cryptographically secure random hex token.
// Panics if the CSPRNG fails — a broken RNG must not issue predictable secrets.
func MustGenerateSecureToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Sprintf("crypto/rand failed: %v", err))
	}
	return hex.EncodeToString(b)
}

func GenerateSecureToken() string {
	return MustGenerateSecureToken()
}

// TokenExpiry returns a time.Time that is `minutes` from now.
func TokenExpiry(minutes int) time.Time {
	return time.Now().Add(time.Duration(minutes) * time.Minute)
}
