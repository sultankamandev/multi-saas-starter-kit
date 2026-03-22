package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func LanguageMiddleware() gin.HandlerFunc {
	supportedLangs := map[string]bool{
		"en": true,
		"tr": true,
		"de": true,
		"fr": true,
	}

	return func(c *gin.Context) {
		lang := c.Query("lang")
		if lang == "" {
			lang = c.GetHeader("Accept-Language")
		}

		// Normalize language code (lowercase and take first 2 characters)
		lang = strings.ToLower(lang)
		if len(lang) > 2 {
			lang = lang[:2]
		}

		// Validate supported languages, default to "en" if not supported or empty
		if lang == "" || !supportedLangs[lang] {
			lang = "en"
		}

		c.Set("lang", lang)
		c.Next()
	}
}
