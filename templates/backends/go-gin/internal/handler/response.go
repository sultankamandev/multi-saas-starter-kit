package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"saas-starter/backend/go-api/internal/domain"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func writeError(c *gin.Context, err error) {
	lang := getLang(c)

	var domErr *domain.DomainError
	if errors.As(err, &domErr) {
		c.JSON(httpStatus(domErr.Err), gin.H{"error": domErr.Message})
		return
	}

	var twoFAErr *domain.TwoFARequiredError
	if errors.As(err, &twoFAErr) {
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"two_fa_type":  twoFAErr.TwoFAType,
			"user_id":      twoFAErr.PublicID,
			"message":      twoFAErr.Message,
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": i18n.T(lang, "DatabaseError")})
}

func httpStatus(sentinel error) int {
	switch {
	case errors.Is(sentinel, domain.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(sentinel, domain.ErrConflict):
		return http.StatusConflict
	case errors.Is(sentinel, domain.ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(sentinel, domain.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(sentinel, domain.ErrInvalidInput):
		return http.StatusBadRequest
	case errors.Is(sentinel, domain.ErrTokenExpired), errors.Is(sentinel, domain.ErrTokenInvalid), errors.Is(sentinel, domain.ErrTokenRevoked):
		return http.StatusUnauthorized
	case errors.Is(sentinel, domain.ErrEmailNotVerified):
		return http.StatusForbidden
	case errors.Is(sentinel, domain.ErrTooManyAttempts), errors.Is(sentinel, domain.ErrRateLimited):
		return http.StatusTooManyRequests
	default:
		return http.StatusInternalServerError
	}
}

func getLang(c *gin.Context) string {
	if v, ok := c.Get("lang"); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return "en"
}

func formatValidationErrors(err error, lang string) map[string]string {
	errs := make(map[string]string)

	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		for _, fe := range ve {
			field := jsonFieldName(fe.Field())
			key := validationErrorKey(fe.Tag(), fe.Field())
			errs[field] = i18n.T(lang, key)
		}
		return errs
	}

	errs["error"] = i18n.T(lang, "InvalidRequest")
	return errs
}

func jsonFieldName(field string) string {
	names := map[string]string{
		"FirstName": "first_name", "LastName": "last_name",
		"Email": "email", "Password": "password",
		"Language": "language",
	}
	if n, ok := names[field]; ok {
		return n
	}
	return strings.ToLower(field)
}

func validationErrorKey(tag, field string) string {
	switch tag {
	case "required":
		return "ValidationRequired"
	case "email":
		return "ValidationEmail"
	case "min":
		if field == "Password" || field == "NewPassword" {
			return "ValidationPasswordMin"
		}
		return "ValidationMin"
	case "max":
		return "ValidationMax"
	default:
		return "ValidationInvalid"
	}
}

func extractLanguageFromBody(c *gin.Context) string {
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil || len(bodyBytes) == 0 {
		return getLang(c)
	}
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var raw map[string]interface{}
	if json.Unmarshal(bodyBytes, &raw) == nil {
		if lang, ok := raw["language"].(string); ok && lang != "" {
			lang = strings.ToLower(lang)
			if len(lang) > 2 {
				lang = lang[:2]
			}
			if i18n.IsLanguageSupported(lang) {
				return lang
			}
		}
	}
	return getLang(c)
}
