package utils

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ExtractLanguageFromRequest extracts the language field from raw JSON request body
// Falls back to Accept-Language header (from LanguageMiddleware) if not found in request body
// Priority: 1) Request body "language" field, 2) Accept-Language header, 3) Default to "en"
func ExtractLanguageFromRequest(c *gin.Context) string {
	// Priority 1: Check request body for "language" field
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err == nil && len(bodyBytes) > 0 {
		// Restore body bytes for ShouldBindJSON to work later
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		var raw map[string]interface{}
		if json.Unmarshal(bodyBytes, &raw) == nil {
			if lang, ok := raw["language"].(string); ok && lang != "" {
				lang = strings.ToLower(lang)
				if len(lang) > 2 {
					lang = lang[:2]
				}
				// Validate supported languages
				if _, exists := Languages[lang]; exists {
					return lang
				}
			}
		}
	}

	// Priority 2: Fallback to Accept-Language header (processed by LanguageMiddleware)
	// This handles frontend requests with: config.headers['Accept-Language'] = language
	if langVal, exists := c.Get("lang"); exists {
		if lang, ok := langVal.(string); ok && lang != "" {
			lang = strings.ToLower(lang)
			if len(lang) > 2 {
				lang = lang[:2]
			}
			if _, exists := Languages[lang]; exists {
				return lang
			}
		}
	}

	return "en" // Priority 3: Final default fallback
}

// FormatValidationErrors formats validation errors with translations
func FormatValidationErrors(err error, lang string) map[string]string {
	errors := make(map[string]string)

	// Try to get validator.ValidationErrors
	var validationErrors validator.ValidationErrors

	// Check if it's directly validator.ValidationErrors
	var ok bool
	validationErrors, ok = err.(validator.ValidationErrors)
	if !ok {
		// Check if error has an Unwrap method that might contain ValidationErrors
		type unwrap interface {
			Unwrap() error
		}
		if u, okUnwrap := err.(unwrap); okUnwrap {
			var unwrappedErr error = u.Unwrap()
			if ve, okVE := unwrappedErr.(validator.ValidationErrors); okVE {
				validationErrors = ve
				ok = true
			}
		}
	}

	if ok {
		for _, fieldError := range validationErrors {
			fieldName := getFieldName(fieldError.Field())
			errorKey := getValidationErrorKey(fieldError.Tag(), fieldError.Field())
			errors[fieldName] = T(lang, errorKey)
		}
	} else {
		// For non-validator errors (e.g., JSON parsing errors)
		errors["error"] = T(lang, "InvalidRequest")
	}

	return errors
}

// getFieldName converts struct field name to JSON field name
func getFieldName(field string) string {
	switch field {
	case "FirstName":
		return "first_name"
	case "LastName":
		return "last_name"
	case "Email":
		return "email"
	case "Password":
		return "password"
	case "Role":
		return "role"
	case "Language":
		return "language"
	default:
		return strings.ToLower(field)
	}
}

// getValidationErrorKey generates a translation key for validation errors
func getValidationErrorKey(tag, field string) string {
	switch tag {
	case "required":
		return "ValidationRequired"
	case "email":
		return "ValidationEmail"
	case "min":
		if field == "Password" {
			return "ValidationPasswordMin"
		}
		return "ValidationMin"
	case "max":
		return "ValidationMax"
	default:
		return "ValidationInvalid"
	}
}
