# Multi-Stack Auth Kit

Production-ready **authentication and admin boilerplate**, in more than one language. One
shared API contract ([OpenAPI 3.1](contract/openapi.yaml)), interchangeable backend and
frontend templates that all implement it, and a CLI that scaffolds a complete project in
one command.

**Pick your backend language and your frontend framework independently.** Every
combination speaks the same API, so a Go backend and a React SPA fit together exactly the
way a Python backend and a Next.js app do. That is the point of this project.

> **Scope.** This is an auth kit, not a SaaS kit. It gives you users, sessions, 2FA, OAuth,
> an admin console, and i18n — the layer nearly every app needs and nobody enjoys writing
> twice. It deliberately does **not** include billing, subscriptions, organizations, or
> teams. If you need those, build them on top; see
> [docs/design/multi-tenancy.md](docs/design/multi-tenancy.md) for why they are out of
> scope and what adding them would involve.

```bash
npx create-authkit-app my-project
```

```
? Backend framework:
  > Go (Gin + GORM)
    Python (FastAPI + SQLAlchemy)
    Node.js (Express + Drizzle)       [beta]

? Frontend framework:
  > Next.js (App Router, SSR)
    React (Vite SPA)
    Vue (Vite SPA)                 [beta]

? Include Docker setup? Yes
? CI/CD pipeline: GitHub Actions / GitLab CI / None
```

You get the backend and frontend you picked, an optional Docker setup and CI pipeline,
the API contract at `docs/openapi.yaml`, and generated TypeScript types wired into the
frontend.

## Why this over rolling your own

- **Auth is done, properly.** Refresh-token rotation, single-flight refresh on the client,
  TOTP and email 2FA, recovery codes, rate limiting, and an audit trail — the details that
  take weeks to get right and are embarrassing to get wrong.
- **Your backend language, a modern frontend.** Written for people who want to write Go or
  Python on the server without also hand-building a React or Vue app.
- **Contract-enforced, not contract-hoped.** A backend-agnostic compliance suite proves a
  template implements the API, and CI checks that generated types, locales, and the
  scaffolded Docker setup all stay in sync.
- **Seven locales that actually match.** en, tr, de, fr, es, it, ru, with key parity
  enforced across every template in CI.

**➡️ New project? Start with [docs/getting-started.md](docs/getting-started.md)** — running
the stack, configuring `.env`, creating your first admin user, and receiving email in
development.

## Available stacks

Any backend can be paired with any frontend.

| Backend | Framework | ORM | Status |
| ------- | --------- | --- | ------ |
| Go | Gin | GORM | Stable |
| Python | FastAPI | SQLAlchemy 2.0 | Stable |
| Node.js | Express 5 | Drizzle ORM | Beta |

| Frontend | Framework | Routing | Admin UI | Status |
| -------- | --------- | ------- | -------- | ------ |
| Next.js | React 19, App Router | next-intl (SSR) | react-admin 5 | Stable |
| React SPA | React 19, Vite | React Router 7 | react-admin 5 | Stable |
| Vue SPA | Vue 3, Vite | Vue Router 4 | custom (Vuetify 3) | Beta |

> All three backends pass the compliance suite 35/35 (core endpoints, end-to-end email
> verification, password reset and TOTP 2FA flows, plus a check that every path in
> `openapi.yaml` is actually routed). CI runs it against all three on every push, so the
> number above is measured rather than claimed. Node/Express stays marked beta pending
> broader real-world use, but it is at feature parity with Go and Python.

## Features

- **Authentication** — register, login, JWT access/refresh tokens, logout, logout-all-sessions
- **Two-factor auth** — email 2FA, TOTP (authenticator apps), recovery codes
- **Google OAuth** — sign in with Google
- **Password management** — forgot password, reset via emailed token, email verification
- **User profile** — view and update
- **Admin console** — user CRUD, role management, audit log
- **Analytics** — registration trends, active users, retention, cohort heatmap
- **App settings** — runtime toggles for email verification and 2FA enforcement
- **Rate limiting** — per-IP throttling on auth endpoints, with admin unblock
- **i18n** — 7 locales (en, tr, de, fr, es, it, ru), consistent across every template

Shared stack: Tailwind CSS 4, MUI 7 (React/Next.js), Vuetify 3 (Vue), Axios,
recharts / Chart.js, PostgreSQL 16.

## Documentation

| For | Read |
| --- | ---- |
| Running a generated project | [docs/getting-started.md](docs/getting-started.md) |
| Endpoint reference | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) · [contract/openapi.yaml](contract/openapi.yaml) |
| Auth flows (JWT, 2FA, OAuth) | [docs/authentication.md](docs/authentication.md) |
| Deploying | [docs/deployment.md](docs/deployment.md) |
| How this repo is laid out | [docs/architecture.md](docs/architecture.md) |
| Adding a template / contributing | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) · [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) |
| Working on this repo itself | [docs/maintainers.md](docs/maintainers.md) |

## Contributing to this repo

This repository holds the templates, the CLI, and the contract — not a running app. If you
want to change a template, add a stack, or edit the API contract, see
[docs/maintainers.md](docs/maintainers.md) for the development loop and the checks CI runs.

| Resource | Link |
| -------- | ---- |
| License | [LICENSE](LICENSE) (MIT) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

## License

MIT — see [LICENSE](LICENSE).
