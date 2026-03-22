package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthorizeRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":      "Access denied",
				"error_code": "MISSING_ROLE",
			})
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":      "Access denied",
				"error_code": "INVALID_ROLE",
			})
			return
		}

		for _, allowed := range roles {
			if role == allowed {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":      "You do not have permission to access this resource",
			"error_code": "INSUFFICIENT_ROLE",
		})
	}
}
