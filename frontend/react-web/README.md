# SaaS Starter -- React SPA

Vite + React 19 + TypeScript SPA with full parity to the Next.js frontend. Framework-agnostic pages, same API service layer, same UI.

## Tech Stack

- Vite 6, React 19, TypeScript
- React Router v7 (SPA mode)
- Tailwind CSS 4, MUI 7
- react-admin 5 (admin console)
- Axios, react-hook-form, react-hot-toast, recharts
- i18next + react-i18next

## Quick Start

```bash
cd frontend/react-web
npm install
cp .env.example .env  # edit API URL if needed
npm run dev
```

## Differences from Next.js Version

- Pure client-side SPA (no SSR)
- React Router v7 replaces Next.js App Router
- i18next replaces next-intl (locale in cookie/localStorage, no URL prefix)
- Vite dev proxy replaces Next.js rewrites

## i18n

Supports 7 locales: en, tr, de, fr, es, it, ru (same JSON content as Next.js in `public/locales/`).
