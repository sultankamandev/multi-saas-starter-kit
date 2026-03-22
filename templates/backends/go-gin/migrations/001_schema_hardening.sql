-- =============================================================================
-- Migration 001: Schema Hardening
-- =============================================================================
-- This migration is applied automatically by RunManualMigrations() in Go.
-- It is kept here as a reference for DBAs or manual application.
--
-- All statements are idempotent and safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UUID public_id for users (anti-enumeration)
-- ---------------------------------------------------------------------------
-- GORM AutoMigrate adds the column. This backfills any existing rows.
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id UUID;
UPDATE users SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users (public_id);

-- ---------------------------------------------------------------------------
-- 2. Functional indexes for case-insensitive login lookups
-- ---------------------------------------------------------------------------
-- The GORM unique index on email/username uses exact match, but queries
-- use LOWER(). These expression indexes cover the actual query patterns.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users (LOWER(email)) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
    ON users (LOWER(username)) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Role CHECK constraint
-- ---------------------------------------------------------------------------
-- Prevents invalid roles from being written directly to the database.
-- Application code enforces this too, but the DB is the last line of defense.
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_role
            CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Drop orphaned columns from pre-refactor schema
-- ---------------------------------------------------------------------------
ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_exp;

-- ---------------------------------------------------------------------------
-- 5. Drop soft-delete columns from ephemeral tables
-- ---------------------------------------------------------------------------
-- Token tables are now hard-deleted by the cleanup job.
-- Removing deleted_at means GORM won't inject WHERE deleted_at IS NULL.

ALTER TABLE refresh_tokens         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE password_reset_tokens  DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE password_reset_tokens  DROP COLUMN IF EXISTS updated_at;
ALTER TABLE email_verification_tokens DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE email_verification_tokens DROP COLUMN IF EXISTS updated_at;
ALTER TABLE two_factor_tokens      DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE two_factor_tokens      DROP COLUMN IF EXISTS updated_at;
ALTER TABLE recovery_codes         DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE recovery_codes         DROP COLUMN IF EXISTS updated_at;
ALTER TABLE login_events           DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE login_events           DROP COLUMN IF EXISTS updated_at;
ALTER TABLE admin_actions          DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE admin_actions          DROP COLUMN IF EXISTS updated_at;

-- ---------------------------------------------------------------------------
-- 6. Partial indexes for token lifecycle queries
-- ---------------------------------------------------------------------------
-- Active refresh tokens (used by RevokeAllUserRefreshTokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
    ON refresh_tokens (user_id) WHERE revoked = false;

-- Expiration indexes (used by cleanup job)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
    ON refresh_tokens (expires_at) WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
    ON password_reset_tokens (expires_at) WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires
    ON email_verification_tokens (expires_at) WHERE used = false;

CREATE INDEX IF NOT EXISTS idx_two_factor_tokens_expires
    ON two_factor_tokens (expires_at) WHERE used = false;

-- ---------------------------------------------------------------------------
-- 7. Analytics and admin indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role
    ON users (role) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_verified
    ON users (verified) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_country
    ON users (country) WHERE deleted_at IS NULL AND country != '';

CREATE INDEX IF NOT EXISTS idx_users_language
    ON users (language) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_actions_created
    ON admin_actions (created_at DESC);

-- login_events composite index is handled by GORM tag
-- idx_login_events_user_logged ON login_events (user_id, logged_at)

-- ---------------------------------------------------------------------------
-- 8. Connection pool (application-level, not SQL)
-- ---------------------------------------------------------------------------
-- Configured in Go:
--   SetMaxOpenConns(25)
--   SetMaxIdleConns(10)
--   SetConnMaxLifetime(5 * time.Minute)
--   SetConnMaxIdleTime(1 * time.Minute)

-- ---------------------------------------------------------------------------
-- 9. Token cleanup (application-level)
-- ---------------------------------------------------------------------------
-- A goroutine runs every hour and deletes:
--   - Revoked/expired refresh tokens older than 24h
--   - Used/expired password reset tokens older than 24h
--   - Used/expired email verification tokens older than 24h
--   - Used/expired 2FA tokens older than 24h
--
-- Alternatively, schedule via pg_cron:
--
-- SELECT cron.schedule('cleanup-tokens', '0 * * * *', $$
--   DELETE FROM refresh_tokens
--     WHERE (revoked = true OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '1 day';
--   DELETE FROM password_reset_tokens
--     WHERE (used = true OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '1 day';
--   DELETE FROM email_verification_tokens
--     WHERE (used = true OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '1 day';
--   DELETE FROM two_factor_tokens
--     WHERE (used = true OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '1 day';
-- $$);
