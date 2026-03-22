# Contributing

Thank you for contributing to the SaaS Starter Kit! This guide explains how to add new backend or frontend templates, fix bugs, and improve the project.

## Repository Structure

```
saas-starter/
├── cli/                  # CLI scaffolder (npx create-saas-app)
├── contract/             # OpenAPI spec + generated types + compliance tests
├── templates/
│   ├── _shared/          # Files included in every scaffolded project
│   ├── backends/         # Backend templates (go-gin, python-fastapi, node-express, ...)
│   ├── frontends/        # Frontend templates (next-ts, react-vite-ts, ...)
│   ├── mobile/           # Mobile templates (future)
│   └── infra/            # Docker, CI/CD templates
├── backend/              # Original backends (kept for development)
├── frontend/             # Original frontends (kept for development)
├── docker/               # Original docker-compose files
└── docs/                 # API reference, this file, template spec
```

## Version control (Git)

When you initialize a repository, track **source, templates, contract, docs, CI, and root config**:

- **Core tree:** `cli/`, `contract/` (including `openapi.yaml`, `generated/`, `compliance/`), `templates/` (including `_shared/`, `mobile/` when present, `backends/`, `frontends/`, `infra/`), `docs/`, `backend/`, `frontend/`, `docker/`
- **Repo metadata:** root `README.md`, `.gitignore`, and `.github/` (for example workflows)
- **`examples/`:** include if you keep example content; empty directories need a placeholder such as `.gitkeep` if you want Git to retain them

Do **not** commit artifacts ignored by the root `.gitignore` (for example `node_modules/`, build outputs like `dist/` and `.next/`, `.env` / `.env.local`, IDE folders). The paths `cli/templates`, `cli/contract`, and `cli/docs` are **ephemeral** (created only for `npm publish`); they are gitignored—see [architecture.md](./architecture.md).

After cloning, run `npm install` (or the equivalent) in each package that needs it.

## Adding a New Backend Template

1. **Create the template directory:**
   ```
   templates/backends/your-framework/
   ```

2. **Implement the OpenAPI contract:**
   Every backend must implement all endpoints defined in `contract/openapi.yaml`. See `docs/TEMPLATE_SPEC.md` for the full requirements.

3. **Required files:**
   - Source code implementing all API endpoints
   - `.env.example` with all required environment variables
   - `README.md` explaining setup and architecture
   - Dependency file (`package.json`, `requirements.txt`, `go.mod`, etc.)

4. **Add a manifest entry:**
   Edit `templates/backends/_manifest.json` and add your template:
   ```json
   {
     "id": "your-id",
     "name": "Language (Framework + ORM)",
     "dir": "your-framework",
     "port": 8080,
     "language": "typescript",
     "variants": ["ts"],
     "status": "beta",
     "healthCheck": "/ping",
     "envFile": ".env.example",
     "installCmd": "npm install",
     "devCmd": "npm run dev",
     "dockerfile": "your-framework.Dockerfile",
     "dbUrlEnvFormat": "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
   }
   ```

5. **Add a Dockerfile:**
   Create `templates/infra/docker/dockerfiles/your-framework.Dockerfile`.

6. **Run compliance tests:**
   ```bash
   cd contract/compliance
   API_URL=http://localhost:YOUR_PORT npm test
   ```

7. **Set status:**
   - `beta` while developing
   - `stable` once all compliance tests pass and the template is production-ready

## Adding a New Frontend Template

Same process, but in `templates/frontends/`. The frontend must:

- Accept an API URL via environment variable (documented in `apiUrlEnv` manifest field)
- Implement all pages: auth, dashboard, profile, admin, analytics
- Support the 7 default locales (en, tr, de, fr, es, it, ru)

## Modifying the API Contract

1. Edit `contract/openapi.yaml`
2. Regenerate types: `cd contract && npm run generate`
3. Update all existing backend templates to implement the change
4. Update compliance tests if needed
5. Update `docs/API_REFERENCE.md`

## Development Workflow

```bash
# Work on the CLI
cd cli
npm run dev -- my-test-project

# Work on a backend template
cd templates/backends/node-express
npm run dev

# Run compliance tests against a running backend
cd contract/compliance
API_URL=http://localhost:8080 npm test

# Regenerate TypeScript types from OpenAPI
cd contract
npm run generate
```

## Code Style

- Use the existing patterns in each language (Go: stdlib conventions, Python: PEP 8, TypeScript: strict mode)
- All backends must return `snake_case` JSON keys
- Error responses must follow the shape: `{ error, message, error_code?, errors? }`
- User `id` in API responses must always be the UUID `public_id`, never the internal serial ID

## Pull Request Guidelines

- One template per PR (don't mix backend and frontend changes)
- Include compliance test results in the PR description
- Mark new templates as `beta` status initially
