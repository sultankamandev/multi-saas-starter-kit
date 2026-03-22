# Template Specification

This document defines what every backend and frontend template must implement to be compatible with the SaaS Starter Kit ecosystem.

## Backend Requirements

### API Contract

Every backend must implement all endpoints defined in `contract/openapi.yaml`. The contract includes:

| Group | Endpoints |
| ----- | --------- |
| Health | `GET /ping` |
| Auth (public) | `/auth/register`, `/auth/login`, `/auth/google-login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/refresh-token`, `/auth/logout`, `/auth/verify-2fa`, `/auth/resend-2fa`, `/auth/verify-totp-login`, `/auth/verify-recovery-code` |
| Auth (protected) | `/auth/me`, `/auth/dashboard`, `/auth/logout-all`, `/auth/2fa/setup`, `/auth/2fa/verify-setup` |
| User | `GET/PUT /api/user/profile` |
| Admin - Users | CRUD on `/api/admin/users`, `/api/admin/user-stats`, `/api/admin/actions` |
| Admin - Analytics | `/api/admin/analytics/user-registrations`, `/api/admin/analytics/active-users`, `/api/admin/analytics/retention`, `/api/admin/analytics/cohort`, `/api/admin/summary` |
| Admin - Settings | CRUD on `/api/admin/settings`, `/api/admin/settings/email-verification`, `/api/admin/settings/2fa` |
| Admin - Blocked IPs | `GET /api/admin/blocked-ips`, `DELETE /api/admin/blocked-ips/:ip` |

### Database Schema

All backends share the same PostgreSQL database. Required tables:

- `users` - with `public_id` (UUID), `username`, `first_name`, `last_name`, `email`, `password_hash`, `role`, `verified`, `two_fa_enabled`, `two_fa_secret`, `language`, `country`, `address`, `phone`, `created_at`, `updated_at`, `deleted_at`
- `refresh_tokens` - JWT refresh token storage
- `login_events` - Login audit trail
- `admin_actions` - Admin audit log
- `app_settings` - Key-value app configuration
- `recovery_codes` - 2FA recovery codes

### Response Format

**User object** (returned by all user-related endpoints):
```json
{
  "id": "uuid-string (public_id, never internal serial)",
  "username": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "role": "user | admin",
  "language": "string",
  "country": "string",
  "address": "string",
  "phone": "string",
  "verified": true,
  "two_fa_enabled": false,
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Error response:**
```json
{
  "error": "error_type",
  "message": "Human-readable message",
  "error_code": "optional_code",
  "errors": { "field": ["validation error"] }
}
```

**All JSON keys must be `snake_case`.**

### Authentication

- JWT access tokens (short-lived, ~15 minutes)
- JWT refresh tokens (long-lived, stored in DB)
- Password hashing with bcrypt (cost factor >= 12)
- Rate limiting on `/auth` group (100 req/min per IP)

### Environment Variables

Every backend must read these environment variables:

| Variable | Description |
| -------- | ----------- |
| `PORT` | Server port (default varies by template) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `FRONTEND_URL` | Frontend URL for CORS and email links |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email sending |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret |

### Required Files

```
your-backend/
├── .env.example          # All env vars with defaults/placeholders
├── README.md             # Setup instructions
├── <dependency file>     # package.json, requirements.txt, go.mod, etc.
├── src/ or app/          # Source code
└── locales/              # i18n JSON files (en, tr, de, fr, es, it, ru)
```

### Manifest Entry

Add to `templates/backends/_manifest.json`:

```json
{
  "id": "unique-kebab-id",
  "name": "Language (Framework + ORM)",
  "dir": "directory-name",
  "port": 8080,
  "language": "go | python | typescript | java | csharp",
  "variants": [],
  "status": "beta | stable",
  "healthCheck": "/ping",
  "envFile": ".env.example",
  "installCmd": "command to install dependencies",
  "devCmd": "command to start dev server",
  "dockerfile": "filename.Dockerfile",
  "dbUrlEnvFormat": "connection string template"
}
```

## Frontend Requirements

### Pages

Every frontend must implement these pages/routes:

| Page | Description |
| ---- | ----------- |
| Landing | Public landing page |
| Login | Email/username + password login |
| Register | User registration |
| Dashboard | Authenticated user dashboard |
| Profile | View and edit profile |
| Verify Email | Email verification callback |
| Forgot Password | Request password reset |
| Reset Password | Set new password via token |
| Setup 2FA | TOTP 2FA setup with QR code |
| Verify 2FA | 2FA code entry during login |
| Recovery Login | Login with recovery code |
| Admin | Admin console (react-admin for React/Next.js; custom UI with Vuetify/Element Plus for Vue) with user management, analytics, settings |

### API Integration

- Axios HTTP client with `baseURL` from environment variable
- Request interceptor: attach `Authorization: Bearer <token>` and `Accept-Language` headers
- Response interceptor: auto-refresh on 401, retry original request
- Cookie-based token storage

### Internationalization

Support 7 locales: `en`, `tr`, `de`, `fr`, `es`, `it`, `ru`

### Manifest Entry

Add to `templates/frontends/_manifest.json`:

```json
{
  "id": "unique-kebab-id",
  "name": "Framework (Details)",
  "dir": "directory-name",
  "port": 3000,
  "language": "typescript | javascript",
  "variants": ["ts"],
  "status": "beta | stable",
  "apiUrlEnv": "ENVIRONMENT_VARIABLE_NAME",
  "installCmd": "npm install",
  "devCmd": "npm run dev",
  "dockerfile": "filename.Dockerfile",
  "prodPort": 80
}
```

## Compliance Testing

After implementing a backend, validate it against the compliance test suite:

```bash
# Start your backend on its default port
cd your-backend && your-dev-command

# In another terminal, run tests
cd contract/compliance
API_URL=http://localhost:YOUR_PORT npm test

# For admin tests, set admin credentials
API_URL=http://localhost:YOUR_PORT \
  ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD=your-admin-password \
  npm test
```

All tests must pass before a template can be marked as `stable`.
