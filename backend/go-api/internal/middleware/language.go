package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func LanguageMiddleware() gin.HandlerFunc {
	supported := map[string]bool{
		"en": true, "tr": true, "de": true, "fr": true,
	}

	return func(c *gin.Context) {
		lang := c.Query("lang")
		if lang == "" {
			lang = c.GetHeader("Accept-Language")
		}

		lang = strings.ToLower(lang)
		if len(lang) > 2 {
			lang = lang[:2]
		}

		if lang == "" || !supported[lang] {
			lang = "en"
		}

		c.Set("lang", lang)
		c.Next()
	}
}
