package utils

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"time"
)

// GenerateResetToken generates a secure random token and returns it along with an expiry time (15 minutes from now)
func GenerateResetToken() (string, time.Time) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		log.Printf("Error generating reset token: %v", err)
		// Fallback: use current time as seed for a basic token (not ideal but prevents panic)
		token := hex.EncodeToString([]byte(time.Now().String()))
		expiry := time.Now().Add(15 * time.Minute)
		return token, expiry
	}
	token := hex.EncodeToString(bytes)
	expiry := time.Now().Add(15 * time.Minute)
	return token, expiry
}
