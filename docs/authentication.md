# Authentication

Scaffolded apps share a common **JWT-based** auth model aligned with [contract/openapi.yaml](../contract/openapi.yaml) and [API_REFERENCE.md](./API_REFERENCE.md).

## Overview

- **Registration and login** — Email/password; responses use access and refresh tokens (see API reference for exact JSON shape and snake_case fields).
- **Refresh** — Client sends refresh token to obtain a new access token; rotation rules match the contract.
- **Logout** — Invalidate refresh token(s); optional logout-all-sessions for the current user.
- **Email verification** — Verify-email flow using tokens sent by email (when enabled in app settings).
- **Password reset** — Forgot-password and reset-password endpoints with time-limited tokens.
- **Two-factor authentication (2FA)** — Email OTP, TOTP (authenticator apps), and recovery codes; login may require a second step after password verification.
- **Google OAuth** — Sign-in with Google when `GOOGLE_CLIENT_ID` (and related settings) are configured on the backend and client.

## Frontend integration

- **Next.js** — Uses `NEXT_PUBLIC_API_URL` (and related env vars) to call the API; cookies / client storage patterns are defined in the template.
- **React (Vite)** — Uses `VITE_API_URL` and the same API surface.

Always configure **CORS** and **frontend URL** on the backend to match your dev or production origins.

## Further reading

- [API_REFERENCE.md](./API_REFERENCE.md) — Endpoint list and behaviour
- [deployment.md](./deployment.md) — Env vars and production notes
- Backend template READMEs under `templates/backends/*` for stack-specific setup
