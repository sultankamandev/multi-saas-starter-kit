# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

A **template monorepo**, not an application — a multi-stack **auth kit**: identity,
sessions, 2FA, OAuth, admin console, and i18n, implemented identically across several
language stacks against one shared contract.

Billing, organizations, teams, and per-tenant data are **deliberately out of scope**
(`docs/design/multi-tenancy.md` records that decision). Don't add them, and don't describe
this as a SaaS kit.

It ships:

- `cli/` — the `create-saas-app` scaffolder (TypeScript, ESM, `@clack/prompts` + `ejs`)
- `contract/openapi.yaml` — **source of truth** for every backend's HTTP surface
- `templates/backends/*`, `templates/frontends/*`, `templates/infra/*` — what the CLI actually copies
- `backend/`, `frontend/`, `docker/` — older **reference** copies kept for development; the CLI never reads them

Most changes belong under `templates/` or `contract/`. Editing `backend/go-api` or `frontend/react-web` changes nothing that ships.

## Commands

```bash
cd cli && npm install && npm run build          # CLI: tsc -> dist/
cd cli && npm run dev -- my-test-project        # run the scaffolder from source (tsx)
cd contract && npm run generate                 # regenerate generated/types.ts from openapi.yaml
cd contract && npm run validate                 # redocly lint the spec
```

Consistency checks (run these after touching templates, contract, or locales):

```bash
cd cli && npm run verify-scaffold-docker
```

```bash
cd contract && npm run check-locales
```

Compliance suite (vitest, hits a live server — no backend is started for you):

```bash
cd contract/compliance && API_URL=http://localhost:8080 npm test
```

Admin tests additionally need `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

CLI packaging (`prepublishOnly` = `build` + `bundle-pack-assets`; `postpublish` = `clean-pack-assets`):

```bash
cd cli && npm run bundle-pack-assets && npm run verify-pack && npm run smoke-scaffold
```

`SCAFFOLD_SKIP_INSTALL=1` makes the CLI skip `npm install` in the scaffolded frontend.

## What CI checks

`.github/workflows/ci.yml` runs per-template jobs and does **not** run the compliance suite. Before pushing, the equivalents are:

| Template | Check |
| --- | --- |
| `templates/backends/go-gin` | `go build -o /dev/null ./cmd/server && go vet ./...` |
| `templates/backends/python-fastapi` | `pip install -r requirements.txt && python -m compileall app` |
| `templates/backends/node-express` | `npx tsc --noEmit` |
| `templates/frontends/*` | `npm ci && npm run build` (all three) |
| `contract` | `npm run generate` must leave `generated/types.ts` unchanged |
| locales | `contract/scripts/check-locales.mjs` |
| `cli` | build + `bundle-pack-assets` + `verify-pack` + `smoke-scaffold` + `verify-scaffold-docker` |
| scaffolded project | scaffold 3 combos, then `docker compose config` + `docker compose build` |

The last row is the important one: every other job builds templates **in place**, which is
not what users get. Docker drift is only visible against a generated project.

## Contract-first workflow

Changing an endpoint means changing **all** of these, in order:

1. `contract/openapi.yaml`
2. `cd contract && npm run generate` (commit `contract/generated/types.ts`)
3. every backend template that claims to implement it — go-gin, python-fastapi, node-express
4. `contract/compliance/src/*.test.ts` if behavior changed
5. `docs/API_REFERENCE.md`

Hard rules the compliance suite and templates assume:

- All JSON keys are `snake_case`.
- A user's `id` in any response is the UUID `public_id` — never the internal serial PK.
- Errors are `{ error, message, error_code?, errors? }`.
- Every backend exposes `GET /ping` and rate-limits the `/auth` group.

## Template registry

`templates/backends/_manifest.json` and `templates/frontends/_manifest.json` drive the CLI prompts, ports, install/dev commands, Dockerfile names, and env-var names. A new template is invisible until it has a manifest entry; `status: "experimental"` hides it from the picker (`cli/src/registry.ts`), `beta`/`stable` show it. New templates start at `beta` and only become `stable` once compliance passes.

`cli/src/scaffolder.ts` is where layout decisions live: backend → `backend/`, frontend → `frontend/`, `contract/openapi.yaml` → `docs/openapi.yaml`, `contract/generated/types.ts` → `frontend/src/types/api-generated.ts`. `.ejs` files are rendered (only in `_shared/` and `infra/`); template dirs are copied verbatim, so **don't put EJS syntax inside `templates/backends` or `templates/frontends`**.

## Backend template internals

- **go-gin** — module `saas-starter/backend/go-api`. Single entrypoint `cmd/server/main.go`, layered config → platform → repository → service → handler → router, wired by hand in `main`. Real work goes in `internal/`. (The parallel legacy tree — root `main.go` plus `controllers/ routes/ models/ database/ utils/` — was deleted; don't reintroduce that shape.)
- **python-fastapi** — mirrors the same layering under `app/` (`router/ service/ repository/ domain/ dto/ platform/`), assembled in `app/main.py:create_app` with dependencies stashed on `app.state` during `lifespan`.
- **node-express** — flatter (`src/routes|services|models|config`), Drizzle ORM, beta. Implements the full contract including 2FA (email + TOTP), recovery codes, Google login, password reset and email verification. Still `beta` because it has not been run against the compliance suite — say "not yet compliance-verified", not "incomplete". Its schema mirrors the Go column names exactly, since TEMPLATE_SPEC says all backends target one PostgreSQL schema.

Go errors flow as `domain.DomainError` sentinels mapped to HTTP status in `internal/handler/response.go`; add new cases there rather than returning raw status codes from handlers.

## Frontend template internals

All three share the same shape: `services/{authService,adminService,userService}` on top of a single Axios instance in `src/lib/api.ts`. That instance attaches `Authorization` and `Accept-Language`, and holds a **single-flight refresh promise** so concurrent 401s queue on one `/auth/refresh-token` call; `/auth/refresh-token` and `/auth/logout` are explicitly excluded from retry. Tokens live in cookies (`js-cookie`).

Locales must cover all 7 of `en, tr, de, fr, es, it, ru`, with **identical key sets within a template**. They live in three different places: `next-ts/messages/<lang>.json`, `react-vite-ts/public/locales/<lang>/translation.json`, `vue-vite-ts/public/<lang>/translation.json`. `check-locales` enforces parity and rejects UTF-8 BOMs (a BOM makes `JSON.parse` throw in strict loaders).

## Gotchas

- **Dockerfiles must target the generated layout** (`backend/`, `frontend/`), not the monorepo paths (`backend/go-api/`, `frontend/react-web/`). Public frontend env vars are inlined at build time, so they are `ARG`s, and their value must be browser-reachable (`http://localhost:8080`), never the compose hostname `http://backend:8080`.
- A frontend served on port 80 has origin `http://localhost` with **no port** — `CORS_ORIGINS` must match that exactly.
- `cli/templates`, `cli/contract`, `cli/docs` are gitignored build artifacts created by `bundle-pack-assets`. Never edit or commit them — edit the real dirs at the repo root.
- `backend/go-api` is a stale near-duplicate of `templates/backends/go-gin`. Fix the template; only mirror into `backend/` if the task explicitly asks.
- `frontend/next-web/` is empty; the Next.js source lives in `templates/frontends/next-ts`.
- There is **no admin bootstrap** — no seed, no env promotion. A fresh install has no admin; the account must be promoted with SQL. Documented in `docs/getting-started.md`.
- Placeholder strings `your-org/...` in `SECURITY.md` and `cli/package.json` are intentional until publish.
