import { sql } from "drizzle-orm";
import { db } from "./database.js";

/**
 * Create any missing tables on boot, so a fresh database works with no manual
 * step — matching GORM's AutoMigrate in the Go template and create_all in the
 * Python one. Drizzle does NOT create tables at runtime; drizzle-kit is a
 * build-time tool, so the DDL lives here explicitly.
 *
 * Every statement is IF NOT EXISTS, so this is safe to run on every start and
 * never touches existing data. It does not alter existing columns — use
 * drizzle-kit for real schema changes.
 *
 * Column names match the Go and Python templates: TEMPLATE_SPEC says all
 * backends target the same PostgreSQL schema. Keep in sync with models/schema.ts.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id SERIAL PRIMARY KEY,
     public_id VARCHAR(36) NOT NULL UNIQUE,
     username VARCHAR(30) UNIQUE,
     first_name VARCHAR(100),
     last_name VARCHAR(100),
     email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR NOT NULL,
     role VARCHAR(20) NOT NULL DEFAULT 'user',
     verified BOOLEAN NOT NULL DEFAULT false,
     two_fa_enabled BOOLEAN NOT NULL DEFAULT false,
     two_fa_secret VARCHAR(255),
     language VARCHAR(5) DEFAULT 'en',
     country VARCHAR(10),
     address VARCHAR(500),
     phone VARCHAR(30),
     created_at TIMESTAMP NOT NULL DEFAULT now(),
     updated_at TIMESTAMP NOT NULL DEFAULT now(),
     deleted_at TIMESTAMP
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username))`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at)`,

  `CREATE TABLE IF NOT EXISTS refresh_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token TEXT NOT NULL UNIQUE,
     expires_at TIMESTAMP NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS login_events (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     ip VARCHAR(45),
     user_agent VARCHAR(500),
     logged_at TIMESTAMP NOT NULL DEFAULT now(),
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_login_events_user_logged ON login_events (user_id, logged_at)`,

  `CREATE TABLE IF NOT EXISTS admin_actions (
     id SERIAL PRIMARY KEY,
     admin_id INTEGER,
     admin_email VARCHAR(255),
     action VARCHAR(50) NOT NULL,
     target_user_id INTEGER,
     target_email VARCHAR(255),
     message TEXT,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions (created_at)`,

  `CREATE TABLE IF NOT EXISTS app_settings (
     id SERIAL PRIMARY KEY,
     key VARCHAR(100) NOT NULL UNIQUE,
     value TEXT,
     created_at TIMESTAMP NOT NULL DEFAULT now(),
     updated_at TIMESTAMP NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS recovery_codes (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     code_hash VARCHAR NOT NULL,
     used BOOLEAN NOT NULL DEFAULT false,
     used_at TIMESTAMP,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes (user_id)`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token VARCHAR NOT NULL UNIQUE,
     expires_at TIMESTAMP NOT NULL,
     used BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id)`,

  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token VARCHAR NOT NULL UNIQUE,
     expires_at TIMESTAMP NOT NULL,
     used BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens (user_id)`,

  `CREATE TABLE IF NOT EXISTS two_factor_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     code VARCHAR NOT NULL,
     remember_me BOOLEAN NOT NULL DEFAULT false,
     attempts INTEGER NOT NULL DEFAULT 0,
     expires_at TIMESTAMP NOT NULL,
     used BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_2fa_user_used ON two_factor_tokens (user_id, used)`,
];

export async function autoMigrate(): Promise<void> {
  for (const statement of STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
  console.log(`Schema ready (${STATEMENTS.length} statements)`);
}
