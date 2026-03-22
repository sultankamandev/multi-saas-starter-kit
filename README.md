# SaaS Starter Kit

Production-ready **multi-stack SaaS boilerplate**: one shared API contract ([OpenAPI 3.1](contract/openapi.yaml)), multiple backend and frontend templates, and a CLI that scaffolds a full project in one command.

**Monorepo vs generated app:** This repo holds templates, the `create-saas-app` CLI, contract, and **reference** apps under `backend/` and `frontend/`. End users typically run `npx create-saas-app` and work only inside the generated folder.

## Quick Start

```bash
npx create-saas-app my-project
```

The CLI will prompt you to choose your stack:

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

Your scaffolded project will include the selected backend, frontend, Docker setup (optional), CI pipeline (optional), bundled API docs (`docs/openapi.yaml`), and generated TypeScript types under the frontend.

### Example combinations

| Backend | Frontend | Use case |
| ------- | -------- | -------- |
| Go (Gin) | React (Vite) | Fast API + SPA, classic BFF-style |
| Python (FastAPI) | Next.js | Async Python + SSR/admin-heavy UI |
| Node (Express) | Next.js | Full TypeScript stack (Express template is beta) |

Any manifest-backed backend can be paired with any frontend the CLI lists.

## Available Stacks

### Backends

| Stack | Framework | ORM | Status |
| ----- | --------- | --- | ------ |
| Go | Gin | GORM | Stable |
| Python | FastAPI | SQLAlchemy 2.0 | Stable |
| Node.js | Express 5 | Drizzle ORM | Beta |

### Frontends

| Stack | Framework | Router | Status |
| ----- | --------- | ------ | ------ |
| Next.js | React 19, App Router | next-intl (SSR) | Stable |
| React SPA | React 19, Vite | React Router 7 | Stable |
| Vue SPA | Vue 3, Vite | Vue Router 4 | Beta |

### Shared Stack

- Tailwind CSS 4, MUI 7 (React/Next.js), Vuetify 3 (Vue), react-admin 5 (React), custom admin UI (Vue), Axios, recharts (React), Chart.js (Vue)
- 7 locales: en, tr, de, fr, es, it, ru
- JWT auth, email 2FA, TOTP, Google OAuth, recovery codes
- PostgreSQL 16

## Features

- **Authentication** -- Register, login, JWT access/refresh tokens, secure logout, logout-all-sessions
- **Two-Factor Auth** -- Email-based 2FA, TOTP (authenticator apps), recovery codes
- **Google OAuth** -- Sign in with Google
- **Password Management** -- Forgot password, reset via email token, email verification
- **User Profile** -- View and update profile
- **Admin Console** -- User CRUD, role management, audit log (react-admin)
- **Analytics Dashboard** -- Registration trends, active users, retention, cohort heatmap
- **App Settings** -- Email verification toggle, 2FA toggle, runtime configuration
- **IP Blocking** -- View and unblock rate-limited IPs
- **Internationalization** -- 7 locales (en, tr, de, fr, es, it, ru)
- **Rate Limiting** -- Per-IP request throttling on auth endpoints

## Project Structure

```
saas-starter/
├── cli/                  # CLI scaffolder (npx create-saas-app)
├── contract/
│   ├── openapi.yaml      # API contract (source of truth)
│   ├── generated/        # Auto-generated TypeScript types
│   └── compliance/       # Backend-agnostic API test suite
├── templates/
│   ├── backends/         # Backend templates
│   │   ├── go-gin/
│   │   ├── python-fastapi/
│   │   └── node-express/
│   ├── frontends/        # Frontend templates
│   │   ├── next-ts/
│   │   ├── react-vite-ts/
│   │   └── vue-vite-ts/
│   └── infra/            # Docker + CI templates
├── docs/                 # API reference, contributing guide, template spec
├── backend/              # Original backends (development)
├── frontend/             # Original frontends (development)
└── docker/               # Original docker-compose files
```

## Development

### Working on the CLI

```bash
cd cli
npm install
npm run dev -- my-test-project
```

### Working on a backend template

```bash
cd templates/backends/node-express
npm install
npm run dev
```

### Regenerating types from OpenAPI

```bash
cd contract
npm install
npm run generate
```

### Running compliance tests

```bash
# Start any backend on its port, then:
cd contract/compliance
npm install
API_URL=http://localhost:8080 npm test
```

### Docker (legacy, per-combination compose files)

```bash
docker compose -f docker/docker-compose.go-next.yml up --build
docker compose -f docker/docker-compose.python-react.yml up --build
```

## Adding a New Stack

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) for the full guide on adding new backend or frontend templates.

## Documentation

| File | Contents |
| ---- | -------- |
| [contract/openapi.yaml](contract/openapi.yaml) | API contract (OpenAPI 3.1) |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Human-readable API reference |
| [docs/architecture.md](docs/architecture.md) | Monorepo layout, contract, and npm packaging |
| [docs/authentication.md](docs/authentication.md) | Auth flows (JWT, 2FA, OAuth) at a high level |
| [docs/deployment.md](docs/deployment.md) | Env vars, Docker, and production notes |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute and add templates |
| [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) | Template author specification |

## Project links

| Resource | Link |
| -------- | ---- |
| License | [LICENSE](LICENSE) (MIT) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

Replace `your-org/saas-starter-kit` in [SECURITY.md](SECURITY.md) and in [cli/package.json](cli/package.json) (`repository`, `homepage`, `bugs`) with your real GitHub org/repo before publishing.

## Maintainers: CLI pack and smoke tests

From `cli/` (Node 18+):

```bash
npm ci
npm run build
npm run bundle-pack-assets
npm run smoke-scaffold
npm run verify-pack
npm run clean-pack-assets   # optional; removes bundled copies under cli/
```

`prepublishOnly` runs `build` + `bundle-pack-assets`; `postpublish` runs `clean-pack-assets`. Set `SCAFFOLD_SKIP_INSTALL=1` when invoking the CLI if you want to skip frontend `npm install` after scaffold (for example in automation).

## License

MIT — see [LICENSE](LICENSE).
