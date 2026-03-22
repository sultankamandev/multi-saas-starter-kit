package service

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
)

// CleanupService runs periodic deletion of expired and consumed tokens.
type CleanupService struct {
	db       *gorm.DB
	interval time.Duration
}

func NewCleanupService(db *gorm.DB, interval time.Duration) *CleanupService {
	if interval == 0 {
		interval = 1 * time.Hour
	}
	return &CleanupService{db: db, interval: interval}
}

// Start runs the cleanup loop in a goroutine. Cancel the context to stop.
func (s *CleanupService) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		s.runOnce()
		for {
			select {
			case <-ctx.Done():
				log.Println("Token cleanup stopped")
				return
			case <-ticker.C:
				s.runOnce()
			}
		}
	}()
	log.Printf("Token cleanup scheduled every %s", s.interval)
}

func (s *CleanupService) runOnce() {
	now := time.Now()

	queries := []struct {
		table string
		sql   string
	}{
		{
			"refresh_tokens",
			"DELETE FROM refresh_tokens WHERE (revoked = true OR expires_at < ?) AND created_at < ?",
		},
		{
			"password_reset_tokens",
			"DELETE FROM password_reset_tokens WHERE (used = true OR expires_at < ?) AND created_at < ?",
		},
		{
			"email_verification_tokens",
			"DELETE FROM email_verification_tokens WHERE (used = true OR expires_at < ?) AND created_at < ?",
		},
		{
			"two_factor_tokens",
			"DELETE FROM two_factor_tokens WHERE (used = true OR expires_at < ?) AND created_at < ?",
		},
	}

	cutoff := now.Add(-24 * time.Hour)
	for _, q := range queries {
		result := s.db.Exec(q.sql, now, cutoff)
		if result.Error != nil {
			log.Printf("Cleanup error (%s): %v", q.table, result.Error)
		} else if result.RowsAffected > 0 {
			log.Printf("Cleanup: deleted %d rows from %s", result.RowsAffected, q.table)
		}
	}
}
