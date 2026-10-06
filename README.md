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

`pnpm db:seed` is idempotent. It seeds the dev user (`DEV_USER_EMAIL`), the muscle landmarks and the exercise catalog (100+ exercises), and can be re-run safely.

API endpoints (see `docs/SPEC.md` section 6):

- `GET /api/health`
- `GET /api/v1/exercises` (filters: `primary_muscle`, `equipment`, `movement_type`, `search`; paging: `limit`, `cursor`)
- `POST /api/v1/exercises` (custom exercise; `409` on a duplicate name)
- `GET /api/v1/muscle-landmarks`
- `GET`/`POST /api/v1/mesocycles`, `GET`/`PATCH`/`DELETE /api/v1/mesocycles/{id}`
- `PUT /api/v1/mesocycles/{id}/schedule` (replace the whole schedule; used for autosave)
- `POST /api/v1/mesocycles/{id}/duplicate-day`
- `POST /api/v1/mesocycles/validate-volume`

Locking a mesocycle (`POST /api/v1/mesocycles/{id}/lock`) arrives in a later milestone.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm e2e
```

`pnpm test` runs unit tests only and needs no database. `pnpm test:integration` runs the
database-backed API tests against `TEST_DATABASE_URL`: it applies migrations and seeds that
database, and it refuses to run if `TEST_DATABASE_URL` equals `DATABASE_URL`.

## Packages

- `packages/shared` — enums, constants and Zod schemas shared by the web app and API.
- `packages/volume-engine` — pure volume calculations (`computeVolume`). `pnpm test` runs it with a 95% coverage threshold.

Both export TypeScript source directly (no build step).
