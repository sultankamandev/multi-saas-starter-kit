package handler

import (
	"net/http"
	"net/url"

	"saas-starter/backend/go-api/internal/middleware"
	"saas-starter/backend/go-api/pkg/i18n"

	"github.com/gin-gonic/gin"
)

type AdminBlockedIPHandler struct{}

func NewAdminBlockedIPHandler() *AdminBlockedIPHandler {
	return &AdminBlockedIPHandler{}
}

func (h *AdminBlockedIPHandler) GetBlockedIPs(c *gin.Context) {
	blockedIPs := middleware.GetAllBlockedIPs()
	if blockedIPs == nil {
		blockedIPs = []middleware.BlockedIP{}
	}

	c.JSON(http.StatusOK, gin.H{
		"blocked_ips": blockedIPs,
		"count":       len(blockedIPs),
	})
}

func (h *AdminBlockedIPHandler) UnblockIP(c *gin.Context) {
	lang := getLang(c)
	ipParam := c.Param("ip")

	if ipParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "InvalidIPAddress")})
		return
	}

	ip, err := url.QueryUnescape(ipParam)
	if err != nil {
		ip = ipParam
	}

	if !middleware.UnblockIPAddr(ip) {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T(lang, "IPNotFoundOrNotBlocked")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "IPUnblockedSuccessfully"),
		"ip":      ip,
	})
}
