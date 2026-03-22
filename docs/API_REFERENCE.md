# API Reference

Base URL: `http://localhost:8080`

All endpoints use JSON request/response bodies unless stated otherwise. Protected endpoints require a `Bearer` token in the `Authorization` header.

---

## Middleware

| Middleware           | Scope            | Description                                              |
| -------------------- | ---------------- | -------------------------------------------------------- |
| `LanguageMiddleware` | Global           | Reads `Accept-Language` header or `lang` query param     |
| `RateLimiter`        | `/auth` group    | 100 requests per minute per IP; 5-minute block on exceed |
| `AuthMiddleware`     | Protected routes | Validates JWT Bearer token, sets user ID and role        |
| `AuthorizeRole`      | Admin routes     | Restricts access to users with `admin` role              |

---

## Health

| Method | Path    | Auth | Description  |
| ------ | ------- | ---- | ------------ |
| GET    | `/ping` | No   | Health check |

---

## Auth -- Public

Rate-limited. No authentication required.

| Method | Path                        | Description                            |
| ------ | --------------------------- | -------------------------------------- |
| POST   | `/auth/register`            | Create a new account                   |
| POST   | `/auth/login`               | Log in with email/username + password  |
| POST   | `/auth/google-login`        | Log in with Google OAuth ID token      |
| POST   | `/auth/forgot-password`     | Request a password reset email         |
| POST   | `/auth/reset-password`      | Reset password using email token       |
| GET    | `/auth/verify-email`        | Verify email address via token (query) |
| POST   | `/auth/refresh-token`       | Refresh access token using refresh token |
| POST   | `/auth/logout`              | Invalidate refresh token               |

### Two-Factor Authentication (public)

| Method | Path                            | Description                          |
| ------ | ------------------------------- | ------------------------------------ |
| POST   | `/auth/verify-2fa`             | Verify email-based 2FA code          |
| POST   | `/auth/resend-2fa`             | Resend email-based 2FA code          |
| POST   | `/auth/verify-totp-login`      | Verify TOTP code during login        |
| POST   | `/auth/verify-recovery-code`   | Log in using a recovery code         |

---

## Auth -- Protected

Requires valid JWT access token.

| Method | Path                       | Description                   |
| ------ | -------------------------- | ----------------------------- |
| GET    | `/auth/me`                 | Get current authenticated user |
| GET    | `/auth/dashboard`          | Get dashboard data             |
| POST   | `/auth/logout-all`         | Invalidate all sessions        |
| POST   | `/auth/2fa/setup`          | Start TOTP 2FA setup (returns QR + secret) |
| POST   | `/auth/2fa/verify-setup`   | Confirm TOTP setup with a valid code |

---

## User

Requires valid JWT access token.

| Method | Path                | Description           |
| ------ | ------------------- | --------------------- |
| GET    | `/api/user/profile` | Get user profile      |
| PUT    | `/api/user/profile` | Update user profile   |

---

## Admin -- User Management

Requires JWT + `admin` role.

| Method | Path                        | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/api/admin/users`          | List all users (paginated) |
| GET    | `/api/admin/users/:id`      | Get user by ID           |
| POST   | `/api/admin/users`          | Create a new user        |
| PUT    | `/api/admin/users/:id`      | Update user              |
| DELETE | `/api/admin/users/:id`      | Delete user              |
| PUT    | `/api/admin/users/:id/role` | Update user role         |
| GET    | `/api/admin/user-stats`     | User statistics summary  |
| GET    | `/api/admin/actions`        | Admin audit log          |

---

## Admin -- Analytics

Requires JWT + `admin` role.

| Method | Path                                        | Description                              |
| ------ | ------------------------------------------- | ---------------------------------------- |
| GET    | `/api/admin/analytics/user-registrations`   | Daily user registration counts           |
| GET    | `/api/admin/analytics/active-users`         | Active user metrics (DAU, WAU, MAU)      |
| GET    | `/api/admin/analytics/retention`            | User retention by cohort period          |
| GET    | `/api/admin/analytics/cohort`               | Cohort retention heatmap data            |
| GET    | `/api/admin/summary`                        | KPI summary (total users, active, new)   |

---

## Admin -- Blocked IPs

Requires JWT + `admin` role.

| Method | Path                         | Description             |
| ------ | ---------------------------- | ----------------------- |
| GET    | `/api/admin/blocked-ips`     | List all blocked IPs    |
| DELETE | `/api/admin/blocked-ips/:ip` | Unblock a specific IP   |

---

## Admin -- Settings

Requires JWT + `admin` role.

| Method | Path                                        | Description                        |
| ------ | ------------------------------------------- | ---------------------------------- |
| GET    | `/api/admin/settings`                       | List all app settings              |
| GET    | `/api/admin/settings/:key`                  | Get a specific setting by key      |
| PUT    | `/api/admin/settings/:key`                  | Update a specific setting          |
| GET    | `/api/admin/settings/email-verification`    | Get email verification setting     |
| PUT    | `/api/admin/settings/email-verification`    | Update email verification setting  |
| GET    | `/api/admin/settings/2fa`                   | Get 2FA enforcement setting        |
| PUT    | `/api/admin/settings/2fa`                   | Update 2FA enforcement setting     |

---

## Legacy Router

The legacy entry point (`main.go` + `routes/authRoutes.go`) uses slightly different paths for some endpoints:

| New Router Path                   | Legacy Router Path             |
| --------------------------------- | ------------------------------ |
| `/auth/google-login`              | `/auth/google`                 |
| `/auth/refresh-token`             | `/auth/refresh`                |
| `/auth/verify-recovery-code`      | `/auth/use-recovery-code`      |
| `/auth/2fa/setup`                 | `/auth/setup-2fa`              |
| `/auth/2fa/verify-setup`          | `/auth/verify-2fa-setup`       |
| `/auth/logout-all`                | (not available)                |
| `/api/admin/user-stats`           | `/api/admin/users/stats`       |
| `/api/admin/analytics/user-registrations` | `/api/admin/analytics/users` |
| `/api/admin/summary`              | `/api/admin/analytics/summary` |
| `/api/admin/settings/email-verification` | `/api/admin/settings/verification/status` (GET) / `/api/admin/settings/verification` (PUT) |
| `/api/admin/settings/2fa`         | `/api/admin/settings/2fa/status` (GET) / `/api/admin/settings/2fa` (PUT) |
