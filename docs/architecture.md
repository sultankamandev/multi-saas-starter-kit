# Architecture

This repository is a **monorepo** for a multi-stack SaaS starter: shared API contract, scaffold templates, a CLI, and reference applications used during development.

## Layout

| Path | Role |
| ---- | ---- |
| [cli/](../cli/) | `create-saas-app` — copies templates + contract snippets into a new project |
| [templates/](../templates/) | Backend, frontend, and infra (Docker, CI) templates used by the CLI |
| [contract/](../contract/) | [openapi.yaml](../contract/openapi.yaml) is the **source of truth** for HTTP APIs; [generated/](../contract/generated/) holds TypeScript types; [compliance/](../contract/compliance) holds backend-agnostic API tests |
| [docs/](./) | API reference, contributing, template spec, and these guides |
| [backend/](../backend/) | **Reference** Go and Python APIs for day-to-day development (not what `npx` scaffolds directly) |
| [frontend/](../frontend/) | **Reference** Next.js and React/Vite apps |
| [docker/](../docker/) | Legacy compose files pairing reference backends and frontends |

## Naming: reference apps vs templates

Scaffolded projects use the **template** directories (for example `templates/backends/go-gin`, `templates/frontends/react-vite-ts`). The monorepo also keeps **reference** copies under `backend/` and `frontend/` with historical folder names:

| Reference (monorepo) | Stack |
| -------------------- | ----- |
| `backend/go-api` | Go + Gin + GORM |
| `backend/python-api` | Python + FastAPI |
| `frontend/next-web` | Next.js (App Router) |
| `frontend/react-web` | React + Vite SPA |

Template IDs used by the CLI are defined in [templates/backends/_manifest.json](../templates/backends/_manifest.json) and [templates/frontends/_manifest.json](../templates/frontends/_manifest.json).

## API contract

All backends should implement the same REST surface described in **OpenAPI 3.1**. When you change the contract:

1. Edit [contract/openapi.yaml](../contract/openapi.yaml).
2. Regenerate types: `cd contract && npm install && npm run generate`.
3. Update each backend template and run [compliance tests](../contract/compliance) against a running instance when possible.

See [TEMPLATE_SPEC.md](./TEMPLATE_SPEC.md) for template author requirements.

## Published CLI package

The npm package `create-saas-app` ships `dist/`, `templates/`, `contract/`, and `docs/` together so `npx create-saas-app` works without the full monorepo. Bundling is handled by [cli/scripts/bundle-pack-assets.mjs](../cli/scripts/bundle-pack-assets.mjs) during `prepublishOnly`.
