# SaaS Starter -- Go API

**Module:** `saas-starter/backend/go-api`

REST API built with Go, Gin, GORM, and PostgreSQL.

## Architecture

```
cmd/server/main.go          -- entry point, dependency injection, server startup
│
├── internal/config          -- loads env vars into Config struct
├── internal/router          -- route definitions + middleware wiring
│
├── internal/handler         -- HTTP handlers (parse request, call service, write response)
│   ├── auth_handler.go
│   ├── twofa_handler.go
│   ├── password_handler.go
│   ├── oauth_handler.go
│   ├── user_handler.go
│   ├── admin_user_handler.go
│   ├── admin_analytics_handler.go
│   ├── admin_settings_handler.go
│   ├── admin_blocked_ip_handler.go
│   └── response.go
│
├── internal/service         -- business logic
│   ├── auth_service.go
│   ├── token_service.go
│   ├── twofa_service.go
│   ├── password_service.go
│   ├── oauth_service.go
│   ├── user_service.go
│   ├── admin_user_service.go
│   ├── analytics_service.go
│   ├── settings_service.go
│   ├── cleanup_service.go
│   └── security.go
│
├── internal/repository      -- data access (GORM queries)
│   ├── interfaces.go        -- repository interfaces
│   ├── user_repo.go
│   ├── token_repo.go
│   ├── twofa_repo.go
│   ├── login_event_repo.go
│   ├── admin_action_repo.go
│   ├── analytics_repo.go
│   └── settings_repo.go
│
├── internal/domain          -- domain models and validation
│   ├── user.go
│   ├── token.go
│   ├── twofa.go
│   ├── password.go
│   ├── username.go
│   ├── login_event.go
│   ├── admin_action.go
│   ├── app_settings.go
│   └── errors.go
│
├── internal/dto             -- request/response DTOs
│   ├── auth.go
│   ├── user.go
│   └── admin.go
│
├── internal/middleware      -- Gin middleware
│   ├── auth.go              -- JWT validation
│   ├── role.go              -- role authorization
│   ├── ratelimiter.go       -- per-IP rate limiting
│   └── language.go          -- Accept-Language / query param
│
├── internal/platform        -- infrastructure adapters
│   ├── database/            -- PostgreSQL connection, transactions
│   ├── jwt/                 -- JWT signing and validation
│   ├── email/               -- SMTP sender and template rendering
│   ├── captcha/             -- reCAPTCHA v3 verification
│   └── geoip/               -- IP geolocation
│
├── locales/                 -- backend i18n (en, tr, de, fr, es, it, ru)
├── templates/emails/        -- HTML email templates
├── migrations/              -- SQL migration files
└── pkg/i18n/                -- i18n helper package
```

The project also contains a **legacy layer** (`main.go`, `controllers/`, `routes/`, `database/`, `models/`, `middleware/`, `utils/`) that predates the `internal/` refactor. Both entry points work; the `cmd/server/main.go` path uses the new architecture.

## Directory Structure

```
backend/go-api/
├── cmd/server/main.go
├── main.go                    (legacy entry)
├── go.mod
├── go.sum
├── .env
├── internal/
│   ├── config/
│   ├── domain/
│   ├── dto/
│   ├── handler/
│   ├── middleware/
│   ├── platform/
│   │   ├── captcha/
│   │   ├── database/
│   │   ├── email/
│   │   ├── geoip/
│   │   └── jwt/
│   ├── repository/
│   ├── router/
│   └── service/
├── controllers/               (legacy)
├── database/                  (legacy)
├── middleware/                (legacy)
├── models/                    (legacy)
├── routes/                    (legacy)
├── utils/                     (legacy)
├── pkg/i18n/
├── locales/
├── templates/emails/
└── migrations/
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable              | Required | Default                  | Description                                |
| --------------------- | -------- | ------------------------ | ------------------------------------------ |
| `DATABASE_URL`        | Yes      | --                       | PostgreSQL connection string               |
| `JWT_SECRET`          | Yes      | --                       | Secret key for signing JWTs                |
| `PORT`                | No       | `8080`                   | HTTP server port                           |
| `JWT_ISSUER`          | No       | `saas-api`               | JWT `iss` claim                            |
| `JWT_AUDIENCE`        | No       | `saas-app`               | JWT `aud` claim                            |
| `FRONTEND_URL`        | No       | `http://localhost:3000`  | Frontend URL for email links               |
| `CORS_ORIGINS`        | No       | `http://localhost:3000`  | Comma-separated allowed origins            |
| `SMTP_HOST`           | No       | --                       | SMTP server hostname                       |
| `SMTP_PORT`           | No       | --                       | SMTP server port (587 for TLS)             |
| `SMTP_USER`           | No       | --                       | SMTP username                              |
| `SMTP_PASS`           | No       | --                       | SMTP password                              |
| `SMTP_FROM`           | No       | value of `SMTP_USER`     | Sender address for outgoing emails         |
| `GOOGLE_CLIENT_ID`    | No       | --                       | Google OAuth client ID                     |
| `RECAPTCHA_SECRET_KEY`| No       | --                       | reCAPTCHA v3 secret key                    |

## Running

```bash
# New architecture
go run cmd/server/main.go

# Legacy entry point
go run main.go
```

The server starts on the configured `PORT` (default `8080`).

## Database

The API uses PostgreSQL via GORM. GORM auto-migrates models on startup. For schema hardening (UUIDs, indexes, constraints), apply the SQL migrations in `migrations/` manually:

```bash
psql -U postgres -d saas_app -f migrations/001_schema_hardening.sql
```
