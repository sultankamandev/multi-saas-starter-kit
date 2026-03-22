# Node.js Express Backend

REST API built with Express 5, Drizzle ORM, and PostgreSQL.

## Stack

- **Runtime:** Node.js 22+
- **Framework:** Express 5
- **ORM:** Drizzle ORM (PostgreSQL)
- **Auth:** JWT (jsonwebtoken), bcryptjs
- **Validation:** Zod
- **Language:** TypeScript

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your database credentials

# Generate and run migrations
npx drizzle-kit generate
npx drizzle-kit migrate

# Start dev server
npm run dev
```

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |

## API

All endpoints follow the shared OpenAPI contract. See `docs/openapi.yaml` for the full specification.
