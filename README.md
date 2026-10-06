# Mesocycle Builder

Hypertrophy mesocycle and schedule builder. Full spec: [`docs/SPEC.md`](docs/SPEC.md).

Build a 3–10 week hypertrophy mesocycle on a horizontal board of day columns (dark theme), with a sticky weekly-volume bar
that updates live against MV / MEV / MAV / MRV landmarks, plus a Review screen. Lock-in (milestone M8) is not built yet.

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

1. **New mesocycle** opens the board right away: an untitled 4-week mesocycle with a Mon–Sun week of rest days.
   **Start from a template** (or **Templates** on the board) fills the week with a prebuilt split: Full Body, Upper / Lower,
   Push / Pull / Legs + Upper / Lower, or Push / Pull / Legs. Everything stays editable.
2. **+ Add** under a day opens the exercise picker. Filter with the muscle chips (several at once), search or pick equipment,
   tick one or many exercises and press **Add N exercises**. **+ Custom** creates your own exercise.
3. Edit sets, reps and RIR on each card. Click the mesocycle name at the top to rename it. The sticky volume bar at the top shows weekly sets for each major
   muscle group (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Abs) and updates as you go.
   Click a chip for landmarks, frequency and contributing exercises; the ⓘ explains MV, MEV, MAV and MRV.
4. Days without exercises are **rest days**. The **Number the days** switch changes Mon–Sun to Day 1, Day 2…
   **+ Add day** (next to it) adds days up to 10 (an 8th day switches to numbered days).
5. **Reorder and move**: press and hold a card, then drag it up, down or to another day. Press and hold a day's header to
   drag the whole day; weekday names stay in place, so moving Tuesday's column to the front makes it Monday. Keyboard: Tab
   to a card (or a day's header), press Space, use the arrow keys (Left/Right jumps to the next day), press Space again. A day's **⋯ menu** has Rename, Duplicate as
   new day, Copy exercises to another day, Clear (make rest day) and Remove day.
6. **Review** shows overall volume per muscle group (weekly, and total sets for the whole mesocycle), summary tiles you can
   hover for details, the duration (3–10 weeks) and deload (hover the ⓘ for what a deload does). **Lock in mesocycle** is a
   placeholder until M8.
7. Changes **autosave** (Saving… / Saved / Save failed with Retry). Reload any time to resume.
8. **Log in** (top right) is a placeholder form; accounts are not part of v1.

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
