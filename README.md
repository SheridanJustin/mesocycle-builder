# Mesocycle Builder

Hypertrophy mesocycle and schedule builder. Full spec: [`docs/SPEC.md`](docs/SPEC.md).

Build a 3–10 week hypertrophy mesocycle on a horizontal board of day columns (dark theme), with a sticky weekly-volume bar
that updates live against MV / MEV / MAV / MRV landmarks, plus a Review screen and lock-in, which freezes the plan and creates every week's workouts.

## Prerequisites

- Node.js 22+
- pnpm 9.15.4+
- PostgreSQL running locally on port 5432 (no Docker needed)

## Setup (PowerShell)

```powershell
Copy-Item .env.example .env      # then edit the passwords/database names and set AUTH_SECRET (see below)
pnpm install
pnpm db:migrate                  # creates the database if missing, applies migrations, regenerates the Prisma client
pnpm db:seed                     # dev user, muscle landmarks and ~100 exercises (safe to re-run)
pnpm dev                         # http://localhost:3000
```

`.env` values (see `.env.example`): `DATABASE_URL` (dev), `TEST_DATABASE_URL` (tests), `DEV_USER_EMAIL`, and for accounts:

- `AUTH_SECRET` (required): signs session cookies. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (optional): enable **Continue with Google**. In Google Cloud Console create an
  OAuth client (APIs & Services > Credentials > Create credentials > OAuth client ID, type *Web application*) with the
  authorized redirect URI `http://localhost:3000/api/auth/callback/google`. Leave them empty to hide the button.

Do not commit `.env`. Your mesocycles from before accounts existed belong to `DEV_USER_EMAIL`: create an account with that
email (on `/login`, Create account) to keep them.

## Using the app

Open <http://localhost:3000>. You'll be asked to sign in: **Create account** (email and password) or **Continue with Google**.
The person icon in the header opens your account: name, email, training stats (workouts and sets done, mesocycles
finished, the active mesocycle's progress), the **Show RIR** switch (turn it off if you don't train by RIR) and **Sign out**.
Each account sees only its own mesocycles.

On the list (**Current** and **Archive** tabs), drag a card by its ⠿ grip to reorder; drafts and archived mesocycles have a **Delete** button.

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
   hover for details, the duration (3–10 weeks) and deload (hover the ⓘ for what a deload does).
7. **Lock in mesocycle** (on Review) freezes the plan. Pick the Monday your first week starts, tick "I understand" if any
   muscle group is below MV or above MRV, and confirm. Every week's workouts are created (RIR drops by 1 each week; a final
   deload week halves the sets) and the plan opens, week by week.
   **Export week as PNG** (on Review, or on the plan) saves the week as an image if you just want a guide.
8. **Train with the plan**: each week shows every day, rest days included. Press **Complete** or **Skip** on a workout
   (**Undo** if you slip). A week is complete when all its workouts are; the mesocycle completes after the last one and moves
   to the **Archive** tab on the list. **Drop mesocycle** stops an active one early (also archived). Archived mesocycles can be
   deleted; active ones can't be edited or deleted.
9. Changes **autosave** (Saving… / Saved / Save failed with Retry). Reload any time to resume.

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

All under `/api/v1` (see SPEC section 6).

- `GET /exercises`, `POST /exercises`, `GET /muscle-landmarks`
- `GET`/`POST /mesocycles`, `GET`/`PATCH`/`DELETE /mesocycles/{id}`, `PUT /mesocycles/order` (list order)
- `POST /mesocycles/{id}/lock` (lock-in: generates weeks, workouts and targets), `POST /mesocycles/{id}/drop`
- `PATCH /sessions/{id}` (mark a workout completed, skipped or planned)
- `PUT /mesocycles/{id}/schedule` (replace the whole schedule; used by autosave)
- `POST /mesocycles/{id}/duplicate-day`, `POST /mesocycles/validate-volume`
- `GET /api/health`

## Layout

- `apps/web`: Next.js app (UI, API routes, Prisma schema and migrations, Playwright tests)
- `packages/shared`: enums, constants and Zod schemas used by the app and the API
- `packages/volume-engine`: pure volume calculations (`computeVolume`), used by both the browser and the server. `pnpm test` enforces 95% coverage on it
