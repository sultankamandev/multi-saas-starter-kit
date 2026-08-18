package config

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	JWTIssuer       string
	JWTAudience     string
	FrontendURL     string
	CORSOrigins     []string
	GoogleClientID  string
	RecaptchaSecret string
	SMTP            SMTPConfig
}

type SMTPConfig struct {
	Host string
	Port string
	User string
	Pass string
	From string
}

func (c *SMTPConfig) IsConfigured() bool {
	// Only host and port are required. Auth is optional: internal relays and
	// dev catchers like Mailpit accept mail with no credentials. Requiring
	// USER/PASS meant those setups silently sent nothing.
	return c.Host != "" && c.Port != ""
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		Port:            envOrDefault("PORT", "8080"),
		DatabaseURL:     mustEnv("DATABASE_URL"),
		JWTSecret:       mustSecret("JWT_SECRET"),
		JWTIssuer:       envOrDefault("JWT_ISSUER", "saas-api"),
		JWTAudience:     envOrDefault("JWT_AUDIENCE", "saas-app"),
		FrontendURL:     envOrDefault("FRONTEND_URL", "http://localhost:3000"),
		CORSOrigins:     parseCORSOrigins(os.Getenv("CORS_ORIGINS")),
		GoogleClientID:  os.Getenv("GOOGLE_CLIENT_ID"),
		RecaptchaSecret: os.Getenv("RECAPTCHA_SECRET_KEY"),
		SMTP: SMTPConfig{
			Host: os.Getenv("SMTP_HOST"),
			Port: os.Getenv("SMTP_PORT"),
			User: os.Getenv("SMTP_USER"),
			Pass: os.Getenv("SMTP_PASS"),
			From: os.Getenv("SMTP_FROM"),
		},
	}

	if cfg.SMTP.From == "" {
		cfg.SMTP.From = cfg.SMTP.User
	}

	return cfg
}

func (c *Config) CORSConfig() cors.Config {
	return cors.Config{
		AllowOrigins:     c.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Accept-Language"},
		ExposeHeaders:    []string{"Content-Length", "X-Total-Count"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
}

func parseCORSOrigins(raw string) []string {
	if raw == "" {
		return []string{"http://localhost:3000"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		if o := strings.TrimSpace(p); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

// minSecretLen is the shortest JWT_SECRET the server will start with. It is
// long enough to reject every placeholder that ships in this repo — the
// .env.example value, the compose default — so nobody boots a signing key that
// was never actually chosen. Python and Node enforce the same number.
const minSecretLen = 32

func mustSecret(key string) string {
	v := mustEnv(key)
	if len(v) < minSecretLen {
		log.Fatalf(
			"%s must be at least %d characters (got %d) — generate one with: openssl rand -base64 48",
			key, minSecretLen, len(v),
		)
	}
	return v
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return v
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
