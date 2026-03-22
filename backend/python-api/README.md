# SaaS Starter -- Python API

FastAPI backend with full parity to the Go API. Both backends share the same PostgreSQL database and JWT secrets, making them interchangeable.

## Tech Stack

- Python 3.12+, FastAPI, Uvicorn
- SQLAlchemy 2.0 (async) + Alembic
- PostgreSQL (shared with Go API)
- Pydantic v2, python-jose, passlib, pyotp

## Quick Start

```bash
cd backend/python-api
python -m venv .venv
.venv/Scripts/activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # edit with your DB credentials
uvicorn app.main:app --reload --port 8000
```

## Endpoints

See [docs/API_REFERENCE.md](../../docs/API_REFERENCE.md) -- all endpoints are identical to the Go API.

## i18n

Supports 7 locales: en, tr, de, fr, es, it, ru (same JSON files as Go API in `locales/`).
