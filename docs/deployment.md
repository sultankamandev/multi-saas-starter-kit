# Deployment

This document summarizes how scaffolded projects are intended to be run in production. Details live in each template’s `README.md` and in the infra templates under `templates/infra/`.

## Environment variables

- **Backend** — Each template ships `.env.example`. Copy to `.env` and set at least `DATABASE_URL`, `JWT_SECRET`, and mail/OAuth keys as needed. See [authentication.md](./authentication.md).
- **Frontend** — Set `NEXT_PUBLIC_API_URL` (Next.js) or `VITE_API_URL` (React/Vite) to your public API base URL. Never commit real `.env` files.

## Docker

When you choose Docker during `create-saas-app`, the CLI renders `docker-compose.yml` and copies Dockerfiles from `templates/infra/docker/`. Typical flow from the generated project root:

```bash
docker compose up --build
```

Adjust ports, secrets, and volumes for your environment before production use.

## Database

Templates target **PostgreSQL**. Run migrations or auto-migrate per backend README (Go/GORM, SQLAlchemy/Alembic, Drizzle, etc.).

## Legacy monorepo compose

The [docker/](../docker/) directory contains compose files for **reference** combinations (for example `docker-compose.go-next.yml`). These paths assume the monorepo’s `backend/` and `frontend/` layout, not a scaffolded output tree.

## CI/CD

The CLI can generate GitHub Actions or GitLab CI from `templates/infra/ci/`. Customize jobs for your registry, test commands, and secrets.

## HTTPS and cookies

In production, serve the API and app over HTTPS, tighten CORS, and configure cookie flags (Secure, SameSite) as required by your hosting provider.
