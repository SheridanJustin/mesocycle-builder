# Mesocycle Builder

Hypertrophy mesocycle and schedule builder.

## Prerequisites

- Node.js 22+
- pnpm 9.15.4+
- PostgreSQL running locally on port 5432

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell) and set `DATABASE_URL`, `TEST_DATABASE_URL`, and
`DEV_USER_EMAIL` for your local PostgreSQL instance. Do not commit `.env`.

## Commands

```powershell
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The health endpoint is available at `GET /api/health`.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

## Packages

- `packages/shared` — enums, constants and Zod schemas shared by the web app and API.
- `packages/volume-engine` — pure volume calculations (`computeVolume`). `pnpm test` runs it with a 95% coverage threshold.

Both export TypeScript source directly (no build step).
