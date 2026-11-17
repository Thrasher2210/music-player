# Music Player

Ad-free YouTube Music client for the web. See `PLAN.md` for the full architecture.

## Structure

```
frontend/app        Next.js 15 website (@mp/web)
frontend/extension  WXT MV3 browser extension — YT session bridge (@mp/extension)
backend/api         Fastify API + Better Auth (@mp/api)
backend/worker      BullMQ worker — Spotify import (@mp/worker)
backend/db          Drizzle schema + migrations (@mp/db)
backend/shared      zod API contract (@mp/api-contract)
```

## Quick start

```bash
corepack enable                  # activates pnpm 10
pnpm install

cp .env.example .env             # fill in OAuth creds later (Phase 0/4)

pnpm db:up                       # start Postgres + Redis (Docker)
pnpm db:migrate                  # run Drizzle migrations

pnpm dev:web                     # http://localhost:3000
pnpm dev:api                     # http://localhost:4000 (healthz: /healthz)
pnpm dev:worker
pnpm dev:ext                     # WXT dev build → load in browser
```

## Verify

```bash
pnpm typecheck && pnpm build
```
