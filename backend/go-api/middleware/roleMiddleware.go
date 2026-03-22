package middleware

import (
	"net/http"

	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// AuthorizeRole restricts access to specific roles
// Usage: admin.Use(middleware.AuthMiddleware(), middleware.AuthorizeRole("admin"))
func AuthorizeRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		lang := c.MustGet("lang").(string)

		// Get role from context (set by AuthMiddleware)
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
			c.Abort()
			return
		}

		roleStr, ok := role.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": utils.T(lang, "Unauthorized")})
			c.Abort()
			return
		}

		// Check if user's role is in the allowed roles list
		for _, allowedRole := range roles {
			if roleStr == allowedRole {
				c.Next()
				return
			}
		}

		// Role not authorized
		c.JSON(http.StatusForbidden, gin.H{"error": utils.T(lang, "AccessDenied")})
		c.Abort()
	}
}

