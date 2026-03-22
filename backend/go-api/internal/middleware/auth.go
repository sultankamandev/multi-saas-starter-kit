package middleware

import (
	"net/http"
	"strings"

	jwtPlatform "saas-starter/backend/go-api/internal/platform/jwt"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtMgr *jwtPlatform.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":      "Authorization header missing or invalid",
				"error_code": "MISSING_TOKEN",
			})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := jwtMgr.Validate(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":      "Invalid or expired token",
				"error_code": "INVALID_TOKEN",
			})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
