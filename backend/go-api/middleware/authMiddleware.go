package middleware

import (
	"net/http"
	"strings"

	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		lang := c.MustGet("lang").(string)

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "AuthorizationHeaderRequired")})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidAuthorizationHeader")})
			c.Abort()
			return
		}

		// Validate the token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "InvalidToken")})
			c.Abort()
			return
		}

		// Set user ID and role in context
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
