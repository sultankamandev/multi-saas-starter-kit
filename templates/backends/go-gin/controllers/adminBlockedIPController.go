package controllers

import (
	"log"
	"net/http"
	"net/url"

	"saas-starter/backend/go-api/database"
	"saas-starter/backend/go-api/middleware"
	"saas-starter/backend/go-api/models"
	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// GetBlockedIPs returns all currently blocked IP addresses
// GET /api/admin/blocked-ips
func GetBlockedIPs(c *gin.Context) {
	blockedIPs := middleware.GetAllBlockedIPs()

	// Ensure we always return an array, even if empty
	if blockedIPs == nil {
		blockedIPs = []middleware.BlockedIP{}
	}

	c.JSON(http.StatusOK, gin.H{
		"blocked_ips": blockedIPs,
		"count":       len(blockedIPs),
	})
}

// UnblockIP removes the block from a specific IP address
// DELETE /api/admin/blocked-ips/:ip
func UnblockIP(c *gin.Context) {
	lang := utils.ExtractLanguageFromRequest(c)
	ipParam := c.Param("ip")

	if ipParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": utils.T(lang, "InvalidIPAddress"),
		})
		return
	}

	// URL decode the IP parameter (Gin should do this automatically, but let's be explicit)
	ip, err := url.QueryUnescape(ipParam)
	if err != nil {
		// If decoding fails, use the original parameter
		ip = ipParam
	}

	log.Printf("🔓 Attempting to unblock IP: %s (decoded from: %s)", ip, ipParam)

	unblocked := middleware.UnblockIP(ip)
	if !unblocked {
		log.Printf("⚠️  Failed to unblock IP: %s (IP not found in visitors map or not currently blocked)", ip)
		c.JSON(http.StatusNotFound, gin.H{
			"error": utils.T(lang, "IPNotFoundOrNotBlocked"),
		})
		return
	}

	// Log admin action
	logAdminIPAction(c, "UNBLOCK_IP", "Unblocked IP address: "+ip, ip)

	c.JSON(http.StatusOK, gin.H{
		"message": utils.T(lang, "IPUnblockedSuccessfully"),
		"ip":      ip,
	})
}

// logAdminIPAction logs an admin action related to IP blocking
func logAdminIPAction(c *gin.Context, action, message, ip string) {
	// Get admin ID from context (set by AuthMiddleware)
	adminID, exists := c.Get("userID")
	if !exists {
		return
	}

	// Get admin email from database
	var admin models.User
	if err := database.DB.First(&admin, adminID).Error; err != nil {
		admin.Email = "unknown"
	} else {
		if admin.Email == "" {
			admin.Email = "unknown"
		}
	}

	// Log to console for now (can be extended to database)
	log.Printf("[ADMIN_ACTION] [%s] Admin: %s (%d) - %s - IP: %s",
		action, admin.Email, adminID, message, ip)
}
