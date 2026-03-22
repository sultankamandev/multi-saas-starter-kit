package utils

import (
	"saas-starter/backend/go-api/models"
	"os"
	"strconv"
)

// IsEmailVerificationRequired checks if email verification is required
// Priority: 1) Database setting, 2) Environment variable, 3) Default (true)
// Can be disabled by setting REQUIRE_EMAIL_VERIFICATION=false in environment
// Or by updating the database setting via admin panel
// Defaults to true (verification required) for security
// Note: To exempt a specific user from verification, set user.Verified = true directly
func IsEmailVerificationRequired() bool {
	// Check database setting (global)
	dbValue := models.GetSetting("require_email_verification", "")
	if dbValue != "" {
		required, err := strconv.ParseBool(dbValue)
		if err == nil {
			return required
		}
	}

	// Fallback to environment variable
	value := os.Getenv("REQUIRE_EMAIL_VERIFICATION")
	if value == "" {
		return true // Default to requiring verification
	}

	required, err := strconv.ParseBool(value)
	if err != nil {
		return true // Default to requiring verification on parse error
	}

	return required
}

// Is2FARequired checks if two-factor authentication is required globally
// Priority: 1) Database setting, 2) Environment variable, 3) Default (false)
// Can be enabled by setting REQUIRE_2FA=true in environment
// Or by updating the database setting via admin panel
// Defaults to false (2FA optional) - users can enable it individually via two_fa_enabled
// Note: This is used for setting default two_fa_enabled during registration
func Is2FARequired() bool {
	// Check database setting (global)
	dbValue := models.GetSetting("require_2fa", "")
	if dbValue != "" {
		required, err := strconv.ParseBool(dbValue)
		if err == nil {
			return required
		}
	}

	// Fallback to environment variable
	value := os.Getenv("REQUIRE_2FA")
	if value == "" {
		return false // Default to optional 2FA
	}

	required, err := strconv.ParseBool(value)
	if err != nil {
		return false // Default to optional 2FA on parse error
	}

	return required
}
