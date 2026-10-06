# AGENTS.md

## Project
Hypertrophy Mesocycle & Schedule Builder. Full spec: `docs/SPEC.md` (source of truth).
If code and spec disagree, ask or update the spec in the same change. Never silently diverge.

## Current milestone
**M2 — Seed data and catalog API.**
(The human updates this line when a milestone is merged. Milestones are listed in SPEC.md section 12.)

## Environment (read this first)
- The developer works on **Windows (PowerShell)**. There is **no Docker and no WSL**.
- PostgreSQL  runs natively at `localhost:5432`. Do not add Docker files or rely on Docker.
- Database config comes only from `.env` in the repo root:
  `DATABASE_URL` (dev), `TEST_DATABASE_URL` (integration tests), `DEV_USER_EMAIL` (seeded dev user).
- Use `.env.example` as the template. **Never create, edit, print, or commit `.env`.** If a new variable is needed, add it to `.env.example` and tell the human.
- Scripts must work on Windows: no bash-only syntax (`export VAR=...`, `&&` chains that assume bash, `rm -rf`).
  Use Node scripts or cross-platform packages (e.g. `cross-env`, `dotenv-cli`) instead.
- The sandbox may be unable to reach the database. If so, say so clearly rather than mocking it, and list the commands the human should run.

## Stack (do not substitute without asking)
- TypeScript everywhere, strict mode on.
- Next.js (App Router) + React for the web app and API route handlers.
- PostgreSQL + Prisma (migrations committed).
- Tailwind CSS for styling.
- @dnd-kit/core + @dnd-kit/sortable for drag and drop (later milestone).
- Zod for all request/response validation. Schemas live in `packages/shared`.
- Vitest for unit tests, Playwright for end-to-end tests.
- pnpm workspaces monorepo:
  - `apps/web`               Next.js app (UI + API routes)
  - `packages/shared`        Zod schemas, types, constants
  - `packages/volume-engine` PURE TypeScript volume logic, no I/O, used by client AND server

## Commands (keep these working at all times, runnable from the repo root)
- `pnpm install`
- `pnpm dev`          run the web app
- `pnpm db:migrate`   apply Prisma migrations (dev database)
- `pnpm db:seed`      seed exercises + muscle landmarks
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`         unit tests
- `pnpm e2e`          Playwright tests

## Rules
1. Work on ONE milestone at a time. Stop when its acceptance criteria pass.
2. Before finishing any task run: `pnpm lint && pnpm typecheck && pnpm test`. Fix failures. If you cannot run something, say so; do not claim it passed.
3. Volume calculations exist ONLY in `packages/volume-engine`. UI and API import it. Never reimplement.
4. Validate every API input and output with the Zod schemas in `packages/shared`.
5. No `any`. No unexplained `// @ts-ignore`.
6. Database changes only via Prisma migrations. Never edit the database by hand.
7. Do not add dependencies without stating why in your summary. Pin versions (no `latest`).
8. Do not build features listed under "Non-goals" in `docs/SPEC.md`.
9. Write tests alongside code, not after.
10. Keep components small. Presentational components do no data fetching.
11. Do not modify `docs/SPEC.md` unless asked, or unless fixing a spec/code conflict (say so in your summary).

## Git
- Work on the current branch. Never commit to or push `main`.
- Make small, logical commits with clear messages.
- Never commit `.env`, secrets, `node_modules`, or build output.

## UI non-negotiables (for later milestones)
- The builder board is HORIZONTAL: day columns side by side in an `overflow-x` container with scroll-snap. The page body must never scroll sideways; only the board does.
- The volume bar is sticky and always visible while the board scrolls.
- Volume status colors are fixed in `docs/SPEC.md` section 7.4. Do not invent others.
- Everything must be keyboard accessible (move up/down buttons exist alongside drag and drop).

## Definition of done (every milestone)
Acceptance criteria from SPEC.md met, tests added and passing, lint and typecheck clean, README updated if setup changed.
End every task with a short summary: what changed, what you ran and the results, and anything you were unsure about.
