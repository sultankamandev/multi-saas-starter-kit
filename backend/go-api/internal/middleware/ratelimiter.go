package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	firstSeen time.Time
	count     int
	blocked   bool
	blockedAt time.Time
}

type BlockedIP struct {
	IP        string    `json:"ip"`
	BlockedAt time.Time `json:"blocked_at"`
}

var (
	visitors = make(map[string]*visitor)
	mu       sync.Mutex
)

func RateLimiter(maxRequests int, window, blockDuration time.Duration) gin.HandlerFunc {
	go cleanupVisitors(window)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if strings.HasPrefix(ip, "::") || ip == "127.0.0.1" {
			c.Next()
			return
		}

		mu.Lock()
		v, exists := visitors[ip]

		if !exists {
			visitors[ip] = &visitor{firstSeen: time.Now(), count: 1}
			mu.Unlock()
			c.Next()
			return
		}

		if v.blocked {
			if time.Since(v.blockedAt) > blockDuration {
				v.blocked = false
				v.count = 1
				v.firstSeen = time.Now()
				mu.Unlock()
				c.Next()
				return
			}
			mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "Too many requests. You are temporarily blocked.",
				"error_code": "BLOCKED",
			})
			return
		}

		if time.Since(v.firstSeen) > window {
			v.count = 1
			v.firstSeen = time.Now()
			mu.Unlock()
			c.Next()
			return
		}

		v.count++
		if v.count > maxRequests {
			v.blocked = true
			v.blockedAt = time.Now()
			mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "Too many requests. You are temporarily blocked.",
				"error_code": "BLOCKED",
			})
			return
		}

		mu.Unlock()
		c.Next()
	}
}

func cleanupVisitors(window time.Duration) {
	for {
		time.Sleep(5 * time.Minute)
		mu.Lock()
		for ip, v := range visitors {
			if !v.blocked && time.Since(v.firstSeen) > window {
				delete(visitors, ip)
			}
		}
		mu.Unlock()
	}
}

func GetAllBlockedIPs() []BlockedIP {
	mu.Lock()
	defer mu.Unlock()

	var blocked []BlockedIP
	for ip, v := range visitors {
		if v.blocked {
			blocked = append(blocked, BlockedIP{IP: ip, BlockedAt: v.blockedAt})
		}
	}
	return blocked
}

func UnblockIPAddr(ip string) bool {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists || !v.blocked {
		return false
	}

	v.blocked = false
	v.count = 0
	v.firstSeen = time.Now()
	return true
}
