package database

import (
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"saas-starter/backend/go-api/internal/domain"
)

func Connect(databaseURL string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("failed to get underlying sql.DB:", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(1 * time.Minute)

	log.Println("Database connected successfully")
	return db
}

func AutoMigrate(db *gorm.DB) {
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.AdminAction{},
		&domain.PasswordResetToken{},
		&domain.EmailVerificationToken{},
		&domain.RefreshToken{},
		&domain.TwoFactorToken{},
		&domain.RecoveryCode{},
		&domain.LoginEvent{},
		&domain.AppSettings{},
	); err != nil {
		log.Fatal("failed to run auto-migration:", err)
	}
}

// RunManualMigrations applies SQL statements that GORM AutoMigrate cannot handle:
// functional indexes, CHECK constraints, and column drops.
// Each statement is idempotent (uses IF NOT EXISTS / IF EXISTS).
func RunManualMigrations(db *gorm.DB) {
	statements := []string{
		// 1. Functional indexes for case-insensitive login lookups
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE deleted_at IS NULL`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE deleted_at IS NULL`,

		// 2. Role CHECK constraint
		`DO $$ BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role'
			) THEN
				ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('user', 'admin'));
			END IF;
		END $$`,

		// 3. Drop orphaned columns from the pre-refactor schema
		`ALTER TABLE users DROP COLUMN IF EXISTS reset_token`,
		`ALTER TABLE users DROP COLUMN IF EXISTS reset_token_exp`,

		// 4. Backfill public_id for any existing users that don't have one
		`UPDATE users SET public_id = gen_random_uuid() WHERE public_id IS NULL OR public_id = ''`,

		// 5. Partial index for active (non-revoked) refresh tokens
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON refresh_tokens (user_id) WHERE revoked = false`,

		// 6. Index for token cleanup queries (expired tokens)
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at) WHERE revoked = false`,
		`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens (expires_at) WHERE used = false`,
		`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens (expires_at) WHERE used = false`,
		`CREATE INDEX IF NOT EXISTS idx_two_factor_tokens_expires ON two_factor_tokens (expires_at) WHERE used = false`,

		// 7. Additional indexes for analytics and admin queries
		`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role) WHERE deleted_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_users_verified ON users (verified) WHERE deleted_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_users_country ON users (country) WHERE deleted_at IS NULL AND country != ''`,
		`CREATE INDEX IF NOT EXISTS idx_users_language ON users (language) WHERE deleted_at IS NULL`,
		`CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at DESC)`,

		// 8. Drop soft-delete columns from tables that no longer use them
		`ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS updated_at`,
		`ALTER TABLE email_verification_tokens DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE email_verification_tokens DROP COLUMN IF EXISTS updated_at`,
		`ALTER TABLE two_factor_tokens DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE two_factor_tokens DROP COLUMN IF EXISTS updated_at`,
		`ALTER TABLE recovery_codes DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE recovery_codes DROP COLUMN IF EXISTS updated_at`,
		`ALTER TABLE login_events DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE login_events DROP COLUMN IF EXISTS updated_at`,
		`ALTER TABLE admin_actions DROP COLUMN IF EXISTS deleted_at`,
		`ALTER TABLE admin_actions DROP COLUMN IF EXISTS updated_at`,
	}

	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			log.Printf("WARNING: manual migration failed: %v\nSQL: %.100s...", err, stmt)
		}
	}
	log.Println("Manual migrations completed")
}
