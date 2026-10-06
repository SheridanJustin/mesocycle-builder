# Mesocycle Builder

Hypertrophy mesocycle and schedule builder. Full spec: [`docs/SPEC.md`](docs/SPEC.md).

Build a 4–6 week training block on a horizontal board of day columns, with a sticky weekly-volume bar
that updates live against MV / MEV / MAV / MRV landmarks. Review and lock-in (milestone M8) are not built yet.

## Prerequisites

- Node.js 22+
- pnpm 9.15.4+
- PostgreSQL running locally on port 5432 (no Docker needed)

## Setup (PowerShell)

```powershell
Copy-Item .env.example .env      # then edit the passwords/database names for your local PostgreSQL
pnpm install
pnpm db:migrate                  # creates the database if it is missing, then applies migrations
pnpm db:seed                     # dev user, muscle landmarks and ~100 exercises (safe to re-run)
pnpm dev                         # http://localhost:3000
```

`.env` needs three values (see `.env.example`): `DATABASE_URL` (dev), `TEST_DATABASE_URL` (tests) and
`DEV_USER_EMAIL`. Do not commit `.env`. Authentication is out of scope: everything runs as the seeded dev user.

## Using the app

Open <http://localhost:3000> (it redirects to the mesocycle list).

1. **New mesocycle**: name, 4–6 weeks, 2–6 training days, relative or calendar schedule.
2. **Step 1 Schedule**: rename days, add or remove days (calendar mode: pick a unique weekday for each).
3. **Step 2 Muscles**: choose the muscle groups for each day and a priority per muscle.
4. **Steps 3–5 (the board)**: add exercises with **+ Add exercise** (search, filters, or create a custom exercise), edit sets, rep range, RIR
   and starting weight on each card, and watch the volume bar at the top. Click a volume chip for landmarks, frequency and contributing exercises.
5. **Reorder and move**: drag a card by its handle (⠿), or use the ↑ ↓ buttons and the "Move to day…" menu. Keyboard: focus the handle, press
   Space, use the arrow keys, press Space again. A day's **⋯ menu** has Duplicate, Rename and Delete.
6. Changes **autosave** (the indicator shows Saving… / Saved / Save failed with Retry). Reload any time to resume.

Step 6 (Review) is a placeholder until M8.

## Commands

```powershell
pnpm lint
pnpm typecheck
pnpm test                # unit tests (no database needed)
pnpm test:integration    # API tests against TEST_DATABASE_URL (runs migrations + seed on that database)
pnpm e2e                 # Playwright tests against TEST_DATABASE_URL
```

`test:integration` and `e2e` modify data, so they refuse to run if `TEST_DATABASE_URL` equals `DATABASE_URL`.
The e2e run starts its own dev server on port 3100 with its own build folder (`.next-e2e`), so it can run while `pnpm dev` is running.

First time running e2e, install the browser: `pnpm --filter @mesocycle/web exec playwright install chromium`.
To use a Chromium you already have, set `PW_CHROMIUM_EXECUTABLE` to its path.

## API

All under `/api/v1` (see SPEC section 6). Mesocycle locking (`POST /mesocycles/{id}/lock`) arrives in M8.

- `GET /exercises`, `POST /exercises`, `GET /muscle-landmarks`
- `GET`/`POST /mesocycles`, `GET`/`PATCH`/`DELETE /mesocycles/{id}`
- `PUT /mesocycles/{id}/schedule` (replace the whole schedule; used by autosave)
- `POST /mesocycles/{id}/duplicate-day`, `POST /mesocycles/validate-volume`
- `GET /api/health`

## Layout

- `apps/web`: Next.js app (UI, API routes, Prisma schema and migrations, Playwright tests)
- `packages/shared`: enums, constants and Zod schemas used by the app and the API
- `packages/volume-engine`: pure volume calculations (`computeVolume`), used by both the browser and the server. `pnpm test` enforces 95% coverage on it
