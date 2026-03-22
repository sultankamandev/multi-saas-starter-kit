package middleware

import (
	"log"
	"net/http"
	"sync"
	"time"

	"saas-starter/backend/go-api/utils"

	"github.com/gin-gonic/gin"
)

// Visitor tracks request count and blocking status for an IP address
type Visitor struct {
	LastSeen     time.Time
	Requests     int
	BlockedUntil time.Time
}

var (
	visitors = make(map[string]*Visitor)
	mu       sync.RWMutex
	once     sync.Once
)

// RateLimiterConfig holds configuration for rate limiting
type RateLimiterConfig struct {
	MaxRequestsPerMinute int           // Maximum requests allowed per minute
	BlockDuration        time.Duration // Duration to block IP after exceeding limit
	CleanupInterval      time.Duration // How often to clean up old visitors
}

// Default configuration
var defaultConfig = RateLimiterConfig{
	MaxRequestsPerMinute: 5,
	BlockDuration:        15 * time.Minute,
	CleanupInterval:      1 * time.Hour,
}

// StartCleanup starts a background goroutine to clean up old visitor records
func startCleanup() {
	go func() {
		ticker := time.NewTicker(defaultConfig.CleanupInterval)
		defer ticker.Stop()

		for range ticker.C {
			mu.Lock()
			now := time.Now()
			for ip, v := range visitors {
				// Remove visitor if not blocked and hasn't been seen in 2 hours
				if v.BlockedUntil.Before(now) && now.Sub(v.LastSeen) > 2*time.Hour {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// RateLimiter returns a Gin middleware that limits requests per IP address
func RateLimiter() gin.HandlerFunc {
	// Start cleanup goroutine once
	once.Do(startCleanup)

	return func(c *gin.Context) {
		lang := utils.ExtractLanguageFromRequest(c)
		ip := c.ClientIP()

		mu.Lock()
		v, exists := visitors[ip]
		if !exists {
			// First visit - create new visitor
			v = &Visitor{
				LastSeen:     time.Now(),
				Requests:     1,
				BlockedUntil: time.Time{}, // Not blocked
			}
			visitors[ip] = v
			mu.Unlock()
			c.Next()
			return
		}

		now := time.Now()

		// Check if IP is currently blocked
		if v.BlockedUntil.After(now) {
			remaining := v.BlockedUntil.Sub(now)
			mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       utils.T(lang, "IPBlocked"),
				"retry_after": int(remaining.Seconds()),
			})
			c.Abort()
			return
		}

		// Reset request count if a minute has passed
		if now.Sub(v.LastSeen) > time.Minute {
			v.Requests = 1
			v.LastSeen = now
		} else {
			v.Requests++
		}

		// Check if limit exceeded
		if v.Requests > defaultConfig.MaxRequestsPerMinute {
			v.BlockedUntil = now.Add(defaultConfig.BlockDuration)
			mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       utils.T(lang, "RateLimitExceeded"),
				"retry_after": int(defaultConfig.BlockDuration.Seconds()),
			})
			c.Abort()
			return
		}

		// Update last seen time
		v.LastSeen = now
		mu.Unlock()

		c.Next()
	}
}

// GetVisitorStats returns statistics for a given IP (for admin/debugging)
func GetVisitorStats(ip string) (*Visitor, bool) {
	mu.RLock()
	defer mu.RUnlock()
	v, exists := visitors[ip]
	if !exists {
		return nil, false
	}
	// Return a copy to avoid race conditions
	return &Visitor{
		LastSeen:     v.LastSeen,
		Requests:     v.Requests,
		BlockedUntil: v.BlockedUntil,
	}, true
}

// ClearVisitorStats clears visitor data for a given IP (for admin use)
func ClearVisitorStats(ip string) {
	mu.Lock()
	defer mu.Unlock()
	delete(visitors, ip)
}

// GetVisitorCount returns the total number of tracked visitors (for monitoring)
func GetVisitorCount() int {
	mu.RLock()
	defer mu.RUnlock()
	return len(visitors)
}

// BlockedIP represents a blocked IP address with its details
type BlockedIP struct {
	IP           string    `json:"ip"`
	BlockedUntil time.Time `json:"blocked_until"`
	LastSeen     time.Time `json:"last_seen"`
	Requests     int       `json:"requests"`
	Remaining    int       `json:"remaining_seconds"` // Seconds until unblock
}

// GetAllBlockedIPs returns all currently blocked IP addresses
func GetAllBlockedIPs() []BlockedIP {
	mu.RLock()
	defer mu.RUnlock()

	now := time.Now()
	var blockedIPs []BlockedIP

	for ip, v := range visitors {
		if v.BlockedUntil.After(now) {
			remaining := int(v.BlockedUntil.Sub(now).Seconds())
			blockedIPs = append(blockedIPs, BlockedIP{
				IP:           ip,
				BlockedUntil: v.BlockedUntil,
				LastSeen:     v.LastSeen,
				Requests:     v.Requests,
				Remaining:    remaining,
			})
		}
	}

	return blockedIPs
}

// UnblockIP removes the block from a specific IP address
func UnblockIP(ip string) bool {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists {
		log.Printf("⚠️  IP %s not found in visitors map", ip)
		return false
	}

	// Check if IP is currently blocked (or was recently blocked)
	now := time.Now()
	if v.BlockedUntil.After(now) {
		// IP is currently blocked - unblock it
		v.BlockedUntil = time.Time{}
		v.Requests = 0 // Reset request count
		log.Printf("✅ Successfully unblocked IP: %s", ip)
		return true
	}

	// IP exists but is not currently blocked - still clear it if it was blocked before
	// This handles the case where the block expired naturally but we still want to clear the record
	if !v.BlockedUntil.IsZero() {
		v.BlockedUntil = time.Time{}
		v.Requests = 0
		log.Printf("✅ Cleared expired block for IP: %s", ip)
		return true
	}

	log.Printf("⚠️  IP %s exists but is not blocked (BlockedUntil: %v)", ip, v.BlockedUntil)
	return false
}
