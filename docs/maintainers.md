# Maintainers Guide

How to work **on this repository**. If you just generated a project with
`npx create-authkit-app`, you want [getting-started.md](./getting-started.md) instead.

## The one thing to internalise

`templates/` is what ships. `backend/` and `frontend/` at the repo root are older
**reference** copies kept for development — the CLI never reads them, so editing them
changes nothing for users. Fix the template.

See [architecture.md](./architecture.md) for the full layout.

## Scope

This is an **auth kit**. Authentication, sessions, 2FA, OAuth, the admin console, and i18n
are in scope. Billing, organizations, and teams are not — see
[design/multi-tenancy.md](./design/multi-tenancy.md). When evaluating a feature request,
the test is whether every app needs it *below* its domain logic.

## Requirements

- Node **24** is what CI runs and what the templates are developed against.
  The published CLI supports **20.11+** (`engines`), because it uses `import.meta.dirname`.
- Go 1.25+ and Python 3.12+ if you are touching those templates
- Docker, to verify the generated Docker setup

## Development loop

```bash
# CLI
cd cli && npm install && npm run build
npm run dev -- my-test-project        # run the scaffolder from source

# Regenerate types after editing the contract
cd contract && npm install && npm run generate

# Work on a template directly
cd templates/backends/node-express && npm install && npm run dev
```

## Checks

Run these before pushing — CI runs the same ones, on both `main` and `develop`.

| Command | What it protects |
| ------- | ---------------- |
| `cd cli && npm run smoke-scaffold` | A scaffolded project has the expected files, including `.env.example` and Docker output |
| `cd cli && npm run verify-scaffold-docker` | Every backend×frontend combo's Dockerfiles resolve against the **generated** layout |
| `cd cli && npm run verify-pack` | The published npm package contains `dist/`, `templates/`, `contract/`, `docs/` |
| `cd contract && npm run generate` | `generated/types.ts` matches `openapi.yaml` (CI fails on a dirty diff) |
| `cd contract && npm run check-locales` | All 6 templates have all 7 locales with identical key sets |
| `cd templates/backends/go-gin && go build ./cmd/server && go vet ./...` | Go template compiles |
| `cd templates/backends/node-express && npx tsc --noEmit` | Node template typechecks |

CI additionally scaffolds three real projects and runs `docker compose build` on them.
This exists because the Dockerfiles were authored against the monorepo layout while the
scaffolder emits `backend/` and `frontend/` — the drift broke `docker compose up --build`
for five of six stacks and nothing caught it, because every other job builds templates
*in place*.

## Compliance tests

The contract suite is backend-agnostic and needs a **running** server; nothing starts one
for you, and CI does not run it.

```bash
# terminal 1
cd templates/backends/go-gin && go run ./cmd/server

# terminal 2
cd contract/compliance && npm install
API_URL=http://localhost:8080 \
  ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD=... \
  npm test
```

Admin tests skip silently without `ADMIN_EMAIL` / `ADMIN_PASSWORD`. A template may only be
marked `stable` once the whole suite passes against it. All three backends currently pass
**34/34**.

### Email and 2FA flow tests

`src/flows.test.ts` covers the end-to-end flows the core suite does not: email
verification, password reset, and TOTP 2FA (setup, login, recovery-code login). They read
the backend's outgoing mail, so they need a sink and skip unless `MAILPIT_URL` is set:

```bash
# a mail catcher the backend can reach
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit

# point the backend's SMTP at it (host.docker.internal from a compose backend),
# then run the suite with the mail sink's web API:
API_URL=http://localhost:8080 MAILPIT_URL=http://localhost:8025 npm test
```

A backend gates email on `SMTP_HOST` alone (auth is optional), sends over plain SMTP to a
non-TLS catcher, and STARTTLS is opportunistic — so a dev catcher just works.

## Changing the API contract

1. Edit [contract/openapi.yaml](../contract/openapi.yaml).
2. `cd contract && npm run generate`, and commit `generated/types.ts`.
3. Update **every** backend template that implements the endpoint.
4. Add or update tests in `contract/compliance/src/`.
5. Update [API_REFERENCE.md](./API_REFERENCE.md).

The contract is the source of truth, but it is not automatically enforced — it has drifted
from the implementations before. When contract and two stable backends disagree, confirm
which one the frontends actually call before deciding which side is wrong.

## Invariants every backend must hold

- All JSON keys are `snake_case`.
- A user's `id` in responses is the UUID `public_id`, never the internal serial PK.
- Errors are `{ error, message, error_code?, errors? }`.
- `GET /ping` exists and the `/auth` group is rate limited.

## Adding a template

Templates are invisible to the CLI until they have an entry in
`templates/backends/_manifest.json` or `templates/frontends/_manifest.json`
(`status: "experimental"` hides them from the picker). Full requirements are in
[TEMPLATE_SPEC.md](./TEMPLATE_SPEC.md); the process is in [CONTRIBUTING.md](./CONTRIBUTING.md).

Two things that are easy to miss:

- Template directories are copied **verbatim**. EJS rendering only happens for
  `templates/_shared/` and `templates/infra/`, so never put `<% %>` syntax inside a
  backend or frontend template.
- New Dockerfiles must be written against the **generated** layout (`backend/`,
  `frontend/`), not the monorepo paths. `npm run verify-scaffold-docker` checks this.

## Publishing the CLI

```bash
cd cli
npm ci
npm run build
npm run bundle-pack-assets   # copies templates/, contract/, docs/ under cli/
npm run verify-pack
npm run smoke-scaffold
npm run clean-pack-assets    # optional; removes the bundled copies
```

`prepublishOnly` runs `build` + `bundle-pack-assets`; `postpublish` runs
`clean-pack-assets`. The bundled `cli/templates`, `cli/contract` and `cli/docs` are
gitignored — never commit or edit them.

Set `SCAFFOLD_SKIP_INSTALL=1` to skip the frontend `npm install` after scaffolding, which
is useful in automation.
