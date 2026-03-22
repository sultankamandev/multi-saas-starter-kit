package utils

import (
	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/models"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"gorm.io/gorm"
)

// Reserved usernames that cannot be used
var reservedUsernames = map[string]bool{
	"admin": true, "administrator": true, "root": true, "system": true,
	"support": true, "help": true, "info": true, "contact": true,
	"api": true, "www": true, "mail": true, "email": true,
	"test": true, "testing": true, "dev": true, "development": true,
	"null": true, "undefined": true, "true": true, "false": true,
	"me": true, "you": true, "user": true, "users": true,
	"login": true, "logout": true, "register": true, "signup": true,
	"settings": true, "profile": true, "account": true, "dashboard": true,
}

// ValidateUsername validates a username according to professional standards
// Rules:
// - 3-30 characters
// - Only alphanumeric characters, underscores, and hyphens
// - Must start with a letter or number
// - Cannot end with underscore or hyphen
// - No consecutive special characters (__ or --)
// - Case-insensitive
// - Not a reserved username
func ValidateUsername(username string) error {
	// Trim whitespace
	username = strings.TrimSpace(username)

	// Check length
	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters")
	}
	if len(username) > 30 {
		return fmt.Errorf("username must be no more than 30 characters")
	}

	// Check if empty after trim
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	// Convert to lowercase for validation
	usernameLower := strings.ToLower(username)

	// Check if reserved
	if reservedUsernames[usernameLower] {
		return fmt.Errorf("this username is reserved and cannot be used")
	}

	// Check if starts with letter or number
	firstChar := rune(usernameLower[0])
	if !unicode.IsLetter(firstChar) && !unicode.IsNumber(firstChar) {
		return fmt.Errorf("username must start with a letter or number")
	}

	// Check if ends with underscore or hyphen
	lastChar := rune(usernameLower[len(usernameLower)-1])
	if lastChar == '_' || lastChar == '-' {
		return fmt.Errorf("username cannot end with an underscore or hyphen")
	}

	// Check for valid characters only (alphanumeric, underscore, hyphen)
	validPattern := regexp.MustCompile(`^[a-z0-9_-]+$`)
	if !validPattern.MatchString(usernameLower) {
		return fmt.Errorf("username can only contain letters, numbers, underscores, and hyphens")
	}

	// Check for consecutive special characters
	if strings.Contains(usernameLower, "__") || strings.Contains(usernameLower, "--") {
		return fmt.Errorf("username cannot contain consecutive underscores or hyphens")
	}

	return nil
}

// NormalizeUsername normalizes a username for storage
// - Converts to lowercase
// - Trims whitespace
func NormalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

// IsUsernameAvailable checks if a username is available (case-insensitive)
// Returns true if available, false if taken
func IsUsernameAvailable(username string, excludeUserID ...uint) (bool, error) {
	normalized := NormalizeUsername(username)

	// Validate first
	if err := ValidateUsername(normalized); err != nil {
		return false, err
	}

	var existingUser models.User
	query := database.DB.Where("LOWER(username) = ?", normalized)
	
	// Exclude current user if updating
	if len(excludeUserID) > 0 && excludeUserID[0] > 0 {
		query = query.Where("id != ?", excludeUserID[0])
	}

	if err := query.First(&existingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return true, nil // Username is available
		}
		return false, err // Database error
	}

	return false, nil // Username is taken
}
