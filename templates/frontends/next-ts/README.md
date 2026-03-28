# SaaS Starter -- Next.js Frontend

**Package:** `saas-starter-next`

Next.js 16 App Router frontend with TypeScript, Tailwind CSS 4, MUI 7, react-admin 5, and next-intl.

## Directory Structure

```
frontend/next-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (AuthProvider, Toaster)
│   │   ├── globals.css                 # Tailwind base styles
│   │   └── [locale]/                   # Locale-scoped App Router
│   │       ├── layout.tsx              # Locale layout (MUI, next-intl provider)
│   │       ├── metadata.ts            # Page metadata
│   │       ├── page.tsx               # Landing page
│   │       ├── error.tsx              # Error boundary
│   │       ├── login/page.tsx
│   │       ├── register/page.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── profile/page.tsx
│   │       ├── admin/page.tsx          # react-admin console
│   │       ├── setup-2fa/page.tsx
│   │       ├── verify-2fa/page.tsx
│   │       ├── verify-email/page.tsx
│   │       ├── recovery-login/page.tsx
│   │       ├── forgot-password/page.tsx
│   │       └── reset-password/page.tsx
│   │
│   ├── components/
│   │   ├── AdminMenu.tsx              # Admin sidebar menu
│   │   ├── AdminRoute.tsx             # Admin route guard
│   │   ├── UserRoute.tsx              # Authenticated route guard
│   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   ├── LanguageSwitcher.tsx       # Locale dropdown
│   │   ├── MUILayout.tsx              # App shell (navbar, sidebar)
│   │   ├── MUIThemeProvider.tsx       # MUI theme setup
│   │   ├── Navigation.tsx            # Main navigation
│   │   └── ui/
│   │       └── LoadingSpinner.tsx     # Shared spinner
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state, login/logout, token refresh
│   │   └── AuthErrorContext.tsx       # Auth error handling
│   │
│   ├── services/
│   │   ├── authService.ts            # Auth API calls (login, register, 2FA, etc.)
│   │   ├── userService.ts            # User profile API calls
│   │   └── adminService.ts           # Admin API calls (analytics, users, settings)
│   │
│   ├── resources/                     # react-admin resource components
│   │   ├── users.tsx                  # User list/edit
│   │   ├── actions.tsx                # Admin audit log
│   │   ├── blockedIPs.tsx             # Blocked IPs list
│   │   ├── settings.tsx               # App settings
│   │   ├── UserAnalyticsDashboard.tsx # Analytics dashboard
│   │   ├── CohortHeatmap.tsx          # Cohort retention heatmap
│   │   └── analytics/
│   │       ├── index.ts
│   │       ├── KPISection.tsx
│   │       ├── RegistrationChart.tsx
│   │       ├── ActiveUsersChart.tsx
│   │       └── RetentionChart.tsx
│   │
│   ├── lib/
│   │   ├── api.ts                     # Axios instance with interceptors
│   │   ├── cookies.ts                 # Token cookie helpers
│   │   ├── routes.ts                  # Route constants
│   │   └── reactAdminDataProvider.ts  # react-admin data provider
│   │
│   ├── hooks/
│   │   ├── useApiRequest.ts           # API request hook with cancellation
│   │   └── useGoogleSignIn.ts         # Google OAuth hook
│   │
│   ├── types/
│   │   ├── auth.ts                    # User, LoginResponse, etc.
│   │   ├── api.ts                     # ApiResponse, ApiError
│   │   └── analytics.ts              # Analytics data types
│   │
│   ├── i18n/
│   │   ├── constants.ts               # Locale config, domain mapping
│   │   ├── localeFromRequest.ts       # Host-based default locale (not Next `proxy`)
│   │   ├── request.ts                 # next-intl v4 request config
│   │   └── routing.ts                 # Locale routing setup
│   │
│   ├── constants/
│   │   └── countries.ts               # Country list
│   │
│   └── middleware.ts                  # Next.js middleware (locale, auth) — must live under src/ with src/app
│
├── messages/                           # i18n translation files
│   ├── en.json
│   ├── tr.json
│   ├── de.json
│   ├── fr.json
│   ├── es.json
│   ├── it.json
│   └── ru.json
│
├── next.config.ts
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

## Page Routes

| Route                  | Auth     | Description                         |
| ---------------------- | -------- | ----------------------------------- |
| `/`                    | Public   | Landing page                        |
| `/login`               | Public   | Login form                          |
| `/register`            | Public   | Registration form                   |
| `/forgot-password`     | Public   | Request password reset              |
| `/reset-password`      | Public   | Set new password via email token    |
| `/verify-email`        | Public   | Email verification callback         |
| `/verify-2fa`          | Public   | Enter email 2FA code during login   |
| `/recovery-login`      | Public   | Login with recovery code            |
| `/dashboard`           | User     | User dashboard                      |
| `/profile`             | User     | View and edit profile               |
| `/setup-2fa`           | User     | Enable TOTP 2FA                     |
| `/admin`               | Admin    | Admin console (react-admin)         |

All routes are prefixed with `/{locale}` (e.g., `/en/login`, `/tr/dashboard`).

## Environment Variables

Create `.env.local` from `.env.example`:

| Variable                            | Required | Description                          |
| ----------------------------------- | -------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL`               | Yes      | Backend API base URL (e.g., `http://localhost:8080`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`      | No       | Google OAuth client ID               |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`    | No       | reCAPTCHA v3 site key                |

## Running

```bash
npm install
npm run dev       # development server on :3000
npm run build     # production build
npm start         # serve production build
npm run lint      # run ESLint
```

## Internationalization

Seven locales are supported: **en**, **tr**, **de**, **fr**, **es**, **it**, **ru**.

- Translation files live in `messages/{locale}.json`.
- Locale routing uses the `[locale]` folder segment via next-intl.
- Domain-based default locales are configured in `src/i18n/constants.ts` (e.g., `app-tr.example.com` defaults to `tr`).
- The `LanguageSwitcher` component lets users switch locale at runtime.
