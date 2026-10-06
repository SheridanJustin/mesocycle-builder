# Hypertrophy Mesocycle & Schedule Builder — Implementation Spec for Codex

**Audience:** An AI coding agent (OpenAI Codex) and the human reviewing its work.
**How to use this document:** This whole file lives at `docs/SPEC.md`; the agent rules live in `AGENTS.md` at the repo root. Then give Codex one milestone at a time from Section 12, always starting with: *"Read AGENTS.md and docs/SPEC.md. Implement Milestone N only. Do not start later milestones."*

---

## 0. Product summary

A web app where a lifter builds a 4–6 week hypertrophy training block (a **mesocycle**) on one screen:

1. **Build** (the board): a repeating cycle of day columns, Mon–Sun by default. Add one or many exercises to a day, edit Week 1 sets, rep ranges, load and RIR inline, and order or move them. A day without exercises is a rest day.
2. Watch live weekly-volume feedback against volume landmarks (MV / MEV / MAV / MRV) in a sticky bar while building.
3. **Review**: block settings (name, duration, deload) now; later the review dashboard and **lock in**, which generates the weekly workout logs.

The signature UI is a **horizontal board**: each day is a vertical column, columns sit side by side, and the user scrolls left-to-right. A **sticky volume bar** stays visible while scrolling and updates live.

*Revision R1 (after M7, requested by the product owner):* the six-step wizard was simplified to **Build** and **Review**. The create form, the Schedule/Muscles/Metrics/Volume steps, explicit muscle-group sections and the priority/focus feature were removed from the UI (see Section 2, decisions 7–10).

### Glossary

| Term | Meaning |
|---|---|
| Mesocycle | A training block, usually 4–6 weeks. |
| Training day | One day in the weekly template (e.g. "Push A"). Repeats every week of the block. |
| Muscle group slot | A container on a day that says "this day trains chest". Exercises live inside it. Holds the priority tier. |
| Exercise slot | One exercise placed on a day, with its Week 1 targets. |
| Set | One working set. "Volume" in this app means **weekly working sets per muscle group**. |
| RIR | Reps in Reserve: how many reps the lifter could still do at the end of a set. 3 RIR means stopping 3 reps short of failure. |
| MV | Maintenance Volume: sets/week needed to hold current muscle. |
| MEV | Minimum Effective Volume: sets/week where growth starts. |
| MAV | Maximum Adaptive Volume: the range of sets/week with best growth. Modeled as `mav_low`–`mav_high`. |
| MRV | Maximum Recoverable Volume: the ceiling beyond which recovery fails. |

---

## 1. AGENTS.md

The agent rules live in the repo-root `AGENTS.md`, which is the maintained copy (it also covers the Windows/native-PostgreSQL environment, the current milestone line and the git rules). This spec no longer duplicates it, so the two cannot drift.

---

## 2. Assumptions and decisions

The original requirements left several things open. These are the decisions made so Codex does not guess. Change them here first if you disagree.

1. **Auth:** Out of scope. Use a `getCurrentUser()` helper that returns a seeded dev user. Every query is scoped by `user_id` so real auth (e.g. Auth.js) can be dropped in later.
2. **Weight units:** The user has a `weight_unit` preference (`kg` or `lb`, default `lb`). Weights are stored as entered, with no conversion.
3. **Counting sets toward volume:** A set counts as **1.0** toward the exercise's primary muscle and **0.5** toward each secondary muscle. The `0.5` is a constant (`SECONDARY_MUSCLE_WEIGHT`) in `packages/shared`.
4. **Landmark values** are seed data in a `muscle_landmarks` table, not hard-coded in UI. The seeded numbers in Section 8 are starting defaults. They are editable and not scientific absolutes.
5. **Progression after Week 1** (adding sets, load changes) is a non-goal for v1. Lock-in copies Week 1 targets into every week, ramping only RIR (Section 9.3). A `ProgressionStrategy` interface exists so smarter logic can be added later.
6. **Draft autosave:** The builder state autosaves via the full-schedule `PUT` (debounced, 800 ms). A draft is always resumable.
7. **Build and Review only:** everything happens on the board (adding, ordering and editing exercises, with the always-on volume bar). Review holds the block settings and, from M8, the dashboard and lock-in. There is no stepper and no completion checks.
8. **Cycle and rest days:** a mesocycle's repeating cycle has 1–10 days, 7 by default. A day without exercises is a **rest day**: it is stored like any other day but generates no sessions at lock-in. Days are named Mon–Sun (`schedule_mode = calendar`, exactly 7 days, `weekday` = position) or numbered "Day 1…N" (`schedule_mode = relative`, no weekdays). A "Number the days" checkbox on the board switches between the two; adding an 8th day switches to numbered days. Names the user typed are kept when switching; generated names are relabelled.
9. **No create form:** "New mesocycle" creates an untitled 4-week Mon–Sun draft and opens the board. Name, duration and deload are edited on Review.
10. **Priorities are shelved:** the focus/normal/maintenance priority, its target band and its hint are hidden in the UI. The data model, the API and the engine keep them, so the feature can return later; every muscle is treated as `normal`.
11. **Muscle groups are implicit:** the UI shows one ordered list of exercises per day, each card tagged with its muscle. `day_muscle_groups` rows are derived on save (one per muscle the day trains, in order of first appearance) and a slot's `muscle` is its exercise's primary muscle when it is added.

---

## 3. Non-goals (do NOT build)

- Authentication, billing, social features, or sharing. (A **Log in** button opens a placeholder email/password form that sends nothing; it exists only as a visual stand-in.)
- Workout logging UI (entering actual reps and weights per set). Lock-in only **generates** empty logs.
- Automatic set or load progression beyond the RIR ramp.
- Mobile native apps. (The web UI must still be usable on a phone via horizontal snap scroll.)
- AI-generated programs.
- Exercise videos or images.

---

## 4. Repository layout

```
/
├─ AGENTS.md
├─ docs/SPEC.md
├─ apps/web/
│  ├─ app/                      Next.js routes
│  │  ├─ api/v1/...             route handlers (Section 6)
│  │  └─ mesocycles/[id]/build  builder page
│  ├─ components/
│  │  ├─ wizard/                Stepper, step panels
│  │  ├─ board/                 Board, DayColumn, MuscleSection, ExerciseCard
│  │  ├─ volume/                VolumeBar, VolumeChip, VolumeDetailPopover
│  │  └─ review/                ReviewDashboard
│  ├─ lib/                      api client, hooks, state store
│  └─ prisma/                   schema.prisma, migrations, seed
├─ packages/shared/             zod schemas, enums, constants
└─ packages/volume-engine/      pure logic + tests
```

---

## 5. Data model

Use Prisma. SQL is shown for clarity. All IDs are UUIDs. All tables have `created_at`. Tables whose rows are edited in place also have `updated_at`: `users`, `exercises`, `muscle_landmarks`, `mesocycles`, `workout_sessions`, `logged_sets`. Template rows (`mesocycle_days`, `day_muscle_groups`, `exercise_slots`) are replaced wholesale by `PUT /schedule`, and `session_exercises` are immutable snapshots, so they have no `updated_at`.

### 5.1 Enums

- `muscle`: `chest, lats, upper_back, traps, front_delts, side_delts, rear_delts, biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs`
- `equipment`: `barbell, dumbbell, cable, machine, bodyweight`
- `movement_type`: `compound, isolation`
- `priority`: `focus, normal, maintenance`
- `mesocycle_status`: `draft, active, completed`
- `schedule_mode`: `calendar, relative`

### 5.2 Tables

```sql
users
  id UUID PK
  email TEXT UNIQUE
  weight_unit TEXT NOT NULL DEFAULT 'lb'   -- 'kg' | 'lb'

exercises
  id UUID PK
  name VARCHAR(255) NOT NULL
  primary_muscle muscle NOT NULL
  secondary_muscles muscle[] NOT NULL DEFAULT '{}'
  equipment_type equipment NOT NULL
  movement_type movement_type NOT NULL
  is_custom BOOLEAN NOT NULL DEFAULT FALSE
  user_id UUID NULL REFERENCES users(id)   -- NULL = global catalog
  UNIQUE (user_id, name)                   -- no duplicate custom names per user
  CHECK (is_custom = (user_id IS NOT NULL))

muscle_landmarks            -- one row per muscle, seed data
  muscle muscle PK
  mv INT NOT NULL
  mev INT NOT NULL
  mav_low INT NOT NULL
  mav_high INT NOT NULL
  mrv INT NOT NULL
  CHECK (mv <= mev AND mev <= mav_low AND mav_low <= mav_high AND mav_high <= mrv)

mesocycles
  id UUID PK
  user_id UUID NOT NULL REFERENCES users(id)
  name VARCHAR(255) NOT NULL
  duration_weeks INT NOT NULL DEFAULT 4 CHECK (duration_weeks BETWEEN 4 AND 6)
  days_per_week INT NOT NULL DEFAULT 7 CHECK (days_per_week BETWEEN 1 AND 10)  -- cycle length, rest days included
  schedule_mode schedule_mode NOT NULL DEFAULT 'calendar'  -- calendar = Mon-Sun names (exactly 7 days); relative = numbered days
  status mesocycle_status NOT NULL DEFAULT 'draft'
  start_date DATE NULL                     -- set at lock-in
  locked_at TIMESTAMP NULL
  deload_final_week BOOLEAN NOT NULL DEFAULT FALSE
  created_at, updated_at

mesocycle_days
  id UUID PK
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 10) -- position in the cycle
  weekday INT NULL CHECK (weekday BETWEEN 0 AND 6)            -- 0=Mon; only when schedule_mode='calendar'
  -- a day with no exercise_slots is a rest day
  day_name VARCHAR(50) NOT NULL
  sort_order INT NOT NULL
  UNIQUE (mesocycle_id, sort_order)

day_muscle_groups           -- the "Muscle Group Slot"
  id UUID PK
  day_id UUID NOT NULL REFERENCES mesocycle_days(id) ON DELETE CASCADE
  muscle muscle NOT NULL
  sort_order INT NOT NULL
  UNIQUE (day_id, muscle)

mesocycle_muscle_priorities -- priority is per muscle per mesocycle, not per day
  mesocycle_id UUID REFERENCES mesocycles(id) ON DELETE CASCADE
  muscle muscle
  priority priority NOT NULL DEFAULT 'normal'
  PRIMARY KEY (mesocycle_id, muscle)

exercise_slots
  id UUID PK
  day_muscle_group_id UUID NOT NULL REFERENCES day_muscle_groups(id) ON DELETE CASCADE
  exercise_id UUID NOT NULL REFERENCES exercises(id)
  sort_order INT NOT NULL                  -- order within the DAY (global across muscle sections)
  target_sets INT NOT NULL DEFAULT 3 CHECK (target_sets BETWEEN 1 AND 10)
  rep_range_min INT NOT NULL DEFAULT 8
  rep_range_max INT NOT NULL DEFAULT 12
  target_rir INT NOT NULL DEFAULT 3 CHECK (target_rir BETWEEN 0 AND 5)
  starting_weight DECIMAL(6,2) NULL
  CHECK (rep_range_min >= 1 AND rep_range_min < rep_range_max AND rep_range_max <= 50)
```

> **Important design note on ordering.** The user orders exercises across a whole day (compounds first, isolation last), even when exercises belong to different muscle sections. So `exercise_slots.sort_order` is unique **per day**, not per muscle group. The `day_muscle_groups` row only records which muscle the slot is *for* (used for grouping/labels and to attribute volume). If an exercise's primary muscle differs from the section it was placed in, the UI warns but allows it; volume is always computed from the exercise's own primary/secondary muscles.

### 5.3 Tables created at lock-in (workout logs)

```sql
mesocycle_weeks
  id UUID PK
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE
  week_number INT NOT NULL                 -- 1..duration_weeks
  is_deload BOOLEAN NOT NULL DEFAULT FALSE
  UNIQUE (mesocycle_id, week_number)

workout_sessions
  id UUID PK
  week_id UUID NOT NULL REFERENCES mesocycle_weeks(id) ON DELETE CASCADE
  day_id UUID NOT NULL REFERENCES mesocycle_days(id)
  scheduled_date DATE NULL                 -- only when schedule_mode='calendar'
  status TEXT NOT NULL DEFAULT 'planned'   -- planned | in_progress | completed | skipped

session_exercises
  id UUID PK
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE
  exercise_id UUID NOT NULL REFERENCES exercises(id)
  sort_order INT NOT NULL
  target_sets INT NOT NULL
  rep_range_min INT NOT NULL
  rep_range_max INT NOT NULL
  target_rir INT NOT NULL
  target_weight DECIMAL(6,2) NULL

logged_sets                 -- created empty? NO: created later by a future logging feature
  id UUID PK
  session_exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE
  set_number INT NOT NULL
  reps INT NULL
  weight DECIMAL(6,2) NULL
  rir INT NULL
```

Create the `logged_sets` table in the migration, but do not populate it at lock-in. `session_exercises` is a **snapshot** copy of the slot data. Editing the draft template later (before lock) never affects generated sessions, and after lock the template is read-only.

---

## 6. REST API

Base path `/api/v1`. JSON only. All inputs/outputs validated with Zod in `packages/shared`. Every endpoint is scoped to the current user; accessing another user's resource returns `404`.

### 6.1 Error format (all endpoints)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [ { "path": "days[0].slots[1].target_sets", "issue": "Must be between 1 and 10" } ] } }
```

Codes: `VALIDATION_ERROR (400)`, `NOT_FOUND (404)`, `CONFLICT (409)` (e.g. editing a locked mesocycle), `INTERNAL (500)`.

### 6.2 Endpoints

**`GET /exercises`**
Query: `primary_muscle`, `equipment`, `movement_type`, `search` (case-insensitive substring on name), `limit` (default 50, max 200), `cursor`.
Returns global catalog plus the current user's custom exercises.
Response: `{ "items": [Exercise], "next_cursor": string | null }`

**`POST /exercises`** — create a custom exercise.
Body: `{ name, primary_muscle, secondary_muscles[], equipment_type, movement_type }`. `409` if the name already exists for this user.

**`GET /muscle-landmarks`**
Returns all landmark rows. The client caches these.

**`POST /mesocycles`** — create a draft.
Body (every field optional; shown with defaults):
```json
{ "name": "Untitled block", "duration_weeks": 4, "days_per_week": 7, "schedule_mode": "calendar" }
```
Creates the mesocycle and `days_per_week` empty days (rest days). Calendar mode needs exactly 7 days, named Mon…Sun with `weekday` 0…6; relative mode allows 1–10 days named "Day 1…N". Days get `sort_order` 1…N. Returns the full mesocycle (`201`).

`days_per_week` is the cycle length (rest days included) and is kept equal to the number of days whenever the schedule is saved.

**`GET /mesocycles`** — list the user's mesocycles (summary only, with `day_count`), most recently updated first.

**`GET /mesocycles/{id}`** — full mesocycle with days, muscle groups, priorities, slots (nested), plus the computed `volume_summary` (Section 7). `priorities` lists only muscles with a stored priority; all others are `normal`. Each slot also carries its `exercise`.

**`PATCH /mesocycles/{id}`** — update `name`, `duration_weeks`, `deload_final_week`. `409` if not `draft`.

**`PUT /mesocycles/{id}/schedule`** — replace the entire schedule (idempotent, used for autosave). `409` if not `draft`.
Body:
```json
{
  "days": [
    {
      "day_number": 1,
      "weekday": null,
      "day_name": "Chest & Triceps",
      "sort_order": 1,
      "muscle_groups": [ { "muscle": "chest", "sort_order": 1 }, { "muscle": "triceps", "sort_order": 2 } ],
      "slots": [
        {
          "client_id": "tmp-1",
          "muscle": "chest",
          "exercise_id": "e3b0c442-...",
          "sort_order": 1,
          "target_sets": 3,
          "rep_range_min": 8,
          "rep_range_max": 12,
          "target_rir": 3,
          "starting_weight": 185.0
        }
      ]
    }
  ],
  "priorities": [ { "muscle": "chest", "priority": "focus" } ]
}
```
Rules: the body may also carry `schedule_mode`; it is saved in the same transaction, so names, weekdays and mode always change together. The schedule has 1–10 days. In `calendar` mode it must have exactly 7 days, each with a unique `weekday`; in `relative` mode every `weekday` is `null`. The server replaces all days/groups/slots/priorities in one transaction (so day, group and slot ids change on every save) and sets `days_per_week` to the number of days. `slot.muscle` must reference a muscle group present on the same day. Every `exercise_id` must be a global exercise or one of the user's own custom exercises, otherwise `400` with the path of the slot. Returns the saved mesocycle. Must complete in under 500 ms for 6 days × 12 slots.

**`POST /mesocycles/{id}/duplicate-day`**
Body: `{ "source_day_id": "...", "target_position": 5, "new_name": "Push B" }`. Deep-copies the day, its muscle groups, and all slots (with all metrics), inserting at `target_position` (1-based; at most current day count + 1, otherwise `400`) and shifting later days. All days are renumbered so `sort_order` and `day_number` are 1…n. Only for numbered (`relative`) cycles: a Mon–Sun week is fixed at 7 days, so this returns `409` in calendar mode. The builder UI does its copies locally and saves them through `PUT /schedule`; this endpoint remains for API clients. `409` if this would exceed 10 days, the mesocycle is in calendar mode, or it is locked. Returns the updated mesocycle.

**`POST /mesocycles/validate-volume`** — stateless; used for live feedback and server-side checks.
Body: `{ "slots": [ { "exercise_id": "...", "target_sets": 3, "day_id": "..." } ], "priorities": [ { "muscle": "chest", "priority": "focus" } ], "assigned_muscles": ["chest"] }` (`day_id` and `assigned_muscles` are optional; `day_id` is needed for `weekly_frequency`, and `assigned_muscles` makes zero-set muscles appear.)
Response: the `VolumeSummary` defined in Section 7.3. (The client normally calls the engine locally; this endpoint exists so server and client share one result and for external callers.)

**`POST /mesocycles/{id}/lock`** — lock-in.
Body: `{ "start_date": "2026-10-05" }` (required if `schedule_mode = calendar`, optional otherwise).
Preconditions (else `400` with details): at least 1 day has at least 1 slot; every slot's exercise exists. Days with zero slots are rest days and are allowed. Volume warnings do **not** block locking, but the request must include `"acknowledge_warnings": true` if any muscle is `EXCEEDS_MRV` or `BELOW_MV`.
Effect, in one transaction: set status `active`, `locked_at`, generate weeks/sessions/session_exercises (Section 9). Returns the active mesocycle with week/session ids.

**`DELETE /mesocycles/{id}`** — delete a draft (cascade). Returns `204`. `409` for active or completed ones.

---

## 7. Volume engine (`packages/volume-engine`)

A **pure, dependency-free TypeScript library**: no database, no React, no `Date.now()`. Fully unit-tested. It is the single source of truth for volume math.

### 7.1 Inputs

```ts
type ExerciseInfo = { id: string; primary: Muscle; secondary: Muscle[] };
type SlotInput   = { exerciseId: string; sets: number; dayId?: string };   // dayId drives weekly_frequency; slots without one share one anonymous day
type Landmarks   = Record<Muscle, { mv: number; mev: number; mavLow: number; mavHigh: number; mrv: number }>;
type Priorities  = Partial<Record<Muscle, 'focus' | 'normal' | 'maintenance'>>;

function computeVolume(
  slots: SlotInput[],
  exercises: Record<string, ExerciseInfo>,
  landmarks: Landmarks,
  priorities: Priorities,
  opts?: { secondaryWeight?: number;         // default 0.5
          assignedMuscles?: Muscle[] }      // muscles assigned to a day; shown even with 0 sets
): VolumeSummary
```

### 7.2 Set attribution

For each slot: add `sets × 1.0` to the exercise's primary muscle, and `sets × secondaryWeight` to each secondary muscle. Sum across all days of the week (the template is one week). Round displayed totals to the nearest 0.5. Keep full precision internally. **Muscles with zero total sets are omitted** unless they are assigned to a day, in which case they appear with total 0 (and status `BELOW_MV` if MV > 0).

### 7.3 Output shape

```json
{
  "summary": {
    "chest": {
      "total_sets": 14,
      "exact_total_sets": 14,
      "weekly_frequency": 2,
      "status": "MAV",
      "landmarks": { "mv": 8, "mev": 10, "mav_low": 12, "mav_high": 20, "mrv": 22 },
      "priority": "focus",
      "target_band": { "low": 16, "high": 20 },
      "color": "green",
      "message": "Within the productive range."
    }
  }
}
```

`total_sets` is rounded to the nearest 0.5 for display; `exact_total_sets` keeps full precision and is what status is computed from. `weekly_frequency` = number of distinct days on which the muscle receives at least one direct (primary) set. This is the "Frequency Validation" from the wizard.

### 7.4 Status rules and colors (fixed)

Let `t` = total weekly sets for a muscle.

| Condition | `status` | `color` | UI meaning |
|---|---|---|---|
| `t < mv` | `BELOW_MV` | `amber` | Warning: below maintenance |
| `mv <= t < mev` | `MAINTENANCE` | `amber` | Maintaining only; below MEV |
| `mev <= t < mav_low` | `ABOVE_MEV` | `lightgreen` | Growth starts; sub-optimal |
| `mav_low <= t <= mav_high` | `MAV` | `green` | Ideal zone |
| `mav_high < t <= mrv` | `HIGH` | `orange` | Approaching the ceiling |
| `t > mrv` | `EXCEEDS_MRV` | `red` | Hard warning |

The five color names are fixed. The app uses a dark theme, so each is rendered as a dark tint, a vivid border/bar and light text (see `apps/web/app/globals.css`): amber `#f59e0b`, lightgreen `#a3e635`, green `#22c55e`, orange `#f97316`, red `#ef4444` (border colors).

Boundary rule: when `mv == mev` (e.g. both 0 for low-need muscles), `t = mv` is treated as `ABOVE_MEV` or better, never `MAINTENANCE`. Write a test for this.

### 7.5 Priority tiers → target band

*Shelved in the UI (decision 10):* the engine still computes bands, but the builder hides them and treats every muscle as `normal`.

Priority never changes the status colors (those depend only on landmarks). It sets a **target band** shown as a marker on the volume chip and used for the hint message:

| Priority | Target band |
|---|---|
| `focus` | upper half of MAV: `[(mav_low + mav_high)/2, mav_high]` |
| `normal` | `[mev, (mav_low + mav_high)/2]` |
| `maintenance` | `[mv, mev]` |

The message tells the user, e.g., "Focus muscle is 4 sets under its target band."

### 7.6 Major muscle groups (what the UI shows)

The builder and Review show volume for ten major groups, not the 15 muscles: **Chest**, **Back** (lats, upper back, traps), **Shoulders** (front, side and rear delts), **Biceps** (biceps and forearms), **Triceps**, **Quads**, **Hamstrings**, **Glutes**, **Calves**, **Abs** (`MUSCLE_GROUP_OF` in `packages/shared`).

- **Attribution:** for each slot, the group of the exercise's primary muscle gets `sets × 1.0`; every *other* group reached by its secondary muscles gets `sets × SECONDARY_MUSCLE_WEIGHT`, once per group. A pull-up (lats + upper back) is therefore 1 back set per set, not 1.5.
- **Landmarks:** a group's MV/MEV/MAV/MRV are the highest of its member muscles' landmarks (merged groups are trained by the same exercises, so their targets do not add up). Status and color follow 7.4.
- **Frequency:** distinct days with at least one set whose primary muscle is in the group.
- **Block totals (Review):** weekly sets × the number of weeks; when the final week is a deload, that week counts each slot at `ceil(sets / 2)` (9.3).
- Engine functions: `computeGroupVolume`, `computeBlockVolume`, `groupLandmarks`, `deloadSets`. The muscle-level `computeVolume` and the `validate-volume` API are unchanged.

### 7.7 Engine tests (required)

- Primary/secondary attribution, including exercises with no secondary muscles.
- Every status boundary (`mv-1, mv, mev-1, mev, mav_low, mav_high, mrv, mrv+1`).
- `mv == mev` edge case.
- Frequency counts distinct days correctly.
- Priority bands for each tier.
- Empty input returns an empty summary.
- Fractional totals round for display but not internally.

---

## 8. Seed data

### 8.1 `muscle_landmarks` defaults (sets/week)

These are starting defaults, editable by changing the seed. They are not medical advice.

| muscle | mv | mev | mav_low | mav_high | mrv |
|---|---|---|---|---|---|
| chest | 8 | 10 | 12 | 20 | 22 |
| lats | 8 | 10 | 14 | 22 | 25 |
| upper_back | 6 | 8 | 12 | 20 | 25 |
| traps | 0 | 0 | 12 | 20 | 26 |
| front_delts | 0 | 0 | 6 | 8 | 12 |
| side_delts | 0 | 8 | 16 | 22 | 26 |
| rear_delts | 0 | 6 | 16 | 22 | 26 |
| biceps | 4 | 8 | 14 | 20 | 26 |
| triceps | 4 | 6 | 10 | 14 | 18 |
| forearms | 2 | 2 | 8 | 12 | 16 |
| quads | 6 | 8 | 12 | 18 | 20 |
| hamstrings | 4 | 6 | 10 | 16 | 20 |
| glutes | 0 | 0 | 4 | 12 | 16 |
| calves | 6 | 8 | 12 | 16 | 20 |
| abs | 0 | 0 | 16 | 20 | 25 |

### 8.2 Exercise catalog

Seed **at least 6 exercises per primary muscle** (at least 90 total), covering all five equipment types across the catalog. Each has `primary_muscle`, `secondary_muscles`, `equipment_type`, `movement_type`. Examples of the required shape:

- Barbell Bench Press — chest; secondary: front_delts, triceps; barbell; compound
- Cable Fly — chest; no secondary; cable; isolation
- Barbell Back Squat — quads; secondary: glutes; barbell; compound
- Lying Leg Curl — hamstrings; none; machine; isolation
- Standing Calf Raise — calves; none; machine; isolation

Seed must be idempotent (re-running does not duplicate rows).

---

## 9. Lock-in behavior

### 9.1 Preconditions
See `POST /mesocycles/{id}/lock` in Section 6.2.

### 9.2 Generation algorithm

For `week` in `1..duration_weeks`:
1. Create a `mesocycle_weeks` row. `is_deload = true` only if `deload_final_week` is true and `week == duration_weeks`.
2. For each `mesocycle_days` row that has at least one slot (rest days are skipped), ordered by `sort_order`, create a `workout_sessions` row (`status = planned`).
   - If `schedule_mode = calendar`: `scheduled_date = start_date + (week-1) × 7 days + offset(weekday)`, where `offset` is relative to the weekday of `start_date`'s week start (Monday). Use a date library (date-fns) and write tests across a month boundary and a DST change.
3. For each slot on that day (ordered by `sort_order`), create a `session_exercises` snapshot using the Section 9.3 rules.

### 9.3 Per-week targets (the `ProgressionStrategy` v1)

Implement `interface ProgressionStrategy { apply(slot, weekNumber, totalWeeks, isDeload): SessionTargets }` with a default `RirRampStrategy`:

- **Sets:** same as Week 1 (`target_sets`). Deload week: `ceil(target_sets / 2)`.
- **Rep range / weight:** same as Week 1. Deload week: weight × 0.9 if present, rounded to 2 decimals.
- **RIR:** `max(0, slot.target_rir - (week - 1))`. Deload week: use the slot's Week 1 RIR.

### 9.4 After lock-in
Status becomes `active`. The template and schedule endpoints return `409`. The builder page redirects to a read-only review/summary view.

---

## 10. UI specification

### 10.1 Pages

- `/mesocycles` — list of mesocycles with status badges and "New mesocycle". "New mesocycle" creates an untitled 4-week Mon–Sun draft and opens its builder (no form).
- `/mesocycles/[id]/build` — the builder: **Build** and **Review** tabs, with the sticky volume bar.
- `/mesocycles/[id]` — read-only view for active/completed (reuses ReviewDashboard).

The app is a full-height shell: **the page itself never scrolls** at common desktop sizes (e.g. 1440×900). Only regions scroll: the board sideways when the days cannot fit, a long day column vertically, and Review as a fallback on short screens. The header has the app name, "My blocks" and **Log in** (placeholder, see Section 3).

The app uses a dark theme built from the product owner's palette (graphite neutrals, electric-aqua accent, verdigris/shamrock positive, snow destructive); tokens live in `apps/web/app/globals.css`.

### 10.2 Tabs

- **Build**: the board (10.3) — the default.
- The **block name** is shown in the builder header and is renamed in place (click, type, Enter).
- **Review**: summary tiles (training days, rest days, sets per week, average session length), a **Volume by muscle group** table — for each trained major group its weekly sets, status, a range bar with MV/MEV/MAV/MRV marks, its weekly frequency and its total sets over the whole block (7.6) — the untrained groups, and the block settings (duration 4–6 weeks, deload final week). Hovering or focusing the ⓘ next to "Deload in the final week" explains it: each exercise drops to half its sets (rounded up), keeps its rep range and returns to its Week 1 RIR, with this block's weekly sets → deload-week sets. A **Lock in block** button is shown; until M8 it only opens a "coming soon" dialog (10.6).

### 10.3 The horizontal board (core requirement)

- A single container `display:flex; overflow-x:auto; scroll-snap-type:x proximity; gap` holding one **DayColumn** per day, with `scroll-snap-align:start`. Training-day columns share the available width (≈ 232–288 px each), rest days are narrow (≈ 112 px), and the row is **centered** (safe centering: when the days cannot fit, the row starts at the left edge and the board scrolls sideways). A Mon–Sun week with typical rest days fits a 1440 px window without scrolling.
- Columns are tall and scroll vertically *inside themselves* if long, but the **primary navigation is left-to-right scrolling**. The page body must not scroll horizontally.
- Above the board: a **"Number the days"** switch (Mon–Sun ↔ Day 1…N, see decision 8), locked on while the cycle does not have exactly 7 days, and the **+ Add day** button (up to 10 days; in a Mon–Sun week it switches to numbered days).
- **DayColumn header:** editable day name (inline edit, max 50 chars), "Rest day" or the estimated duration and exercise count, and a menu: Rename, Duplicate as new day (numbered cycles under 10 days), Copy exercises to (any other day), Clear (make rest day), Remove day (numbered cycles only, never below 1 day).
- **Inside a column:** the day's **ExerciseCards** as one ordered list (no muscle sections). A big **"+ Add"** button sits at the bottom of every column.
- **ExerciseCard:** shows exercise name, its major muscle group (with a color dot), the equipment, and inline editable fields: sets (stepper), rep range (preset dropdown 8–12 / 5–10 / 10–15 / 15–20 / 20–30 or "Custom" with min/max inputs; 8–12 is included because it is the default for a new slot) and RIR (0–5). **Starting weight is not shown**: the builder is a schedule planner. The API and database keep `starting_weight`, and the UI preserves any stored value. It has a small delete (✕) button. There are no move buttons: the whole card is dragged (10.4).
- **Add exercises panel** (opened by "+ Add"): search box, muscle chips (several can be selected at once), an equipment filter, and a checkbox list of the catalog. The user ticks one or many exercises (selections survive filter changes) and confirms with "Add N exercises"; each becomes a slot with defaults (3 sets, 8–12 reps, RIR 3). "+ Custom" opens the create-custom-exercise form; the new exercise is selected.

### 10.4 Drag and drop (dnd-kit)

- **Press and hold** a card (anywhere except its fields and buttons) for about 0.2 s to pick it up, then drag it. A quick click or a scroll never starts a drag.
- Reorder cards within a column; drag a card to another column (across the horizontal plane). The card keeps **all** its metrics and its muscle. The board auto-scrolls horizontally when the pointer nears the left/right edge while dragging.
- Within a day, dropping on a card below puts the dragged card after it and dropping on a card above puts it before it. Dropped on a card in another day, it lands before that card; dropped on another day's column (including a rest day), it goes to the end. A card dropped on its own day's column does nothing.
- Keyboard alternative: the dnd-kit keyboard sensor. Focus a card (it is a focusable group labelled "Move <exercise>") and press Space to pick it up; Up/Down move through the cards of the current day, Left/Right jump to the neighbouring day's column, and Space drops. Results are announced to screen readers.
- Scroll snapping on the board is switched off while a drag is in progress, otherwise it undoes the edge auto-scroll.
- Drag operations update `sort_order` values for the affected days and trigger autosave and a volume recompute.

### 10.5 Sticky volume bar

- A horizontal bar fixed to the top of the builder viewport (below the tabs) that **does not scroll with the board**.
- One **VolumeChip** per major muscle group that has sets (7.6): muscle label, `total_sets`, a mini range-bar showing MV/MEV/MAV/MRV marks, the status label and the weekly frequency. The chip's color comes from Section 7.4. (Priority target bands are hidden; decision 10.)
- The chips sit in a grid (5 per row on narrow screens, 10 on wide ones), so the bar never needs a scrollbar. An **ⓘ** button opens plain-language definitions: MV (Maintenance Volume): ~6 sets per week maintains current muscle mass; MEV (Minimum Effective Volume): starting point for growth, varies by training experience; MAV (Maximum Adaptive Volume): sweet spot range between MEV and MRV for optimal gains; MRV (Maximum Recoverable Volume): upper limit before recovery fails and gains stop. The same ⓘ appears on Review. Clicking a chip opens a popover with the status, weekly sets, frequency, the full landmarks and the list of contributing exercises (and days).
- Updates **synchronously on every change** (no spinner). It calls the local engine; the server result is only used when saving.
- Provide a text/ARIA label for every color state so color is never the only signal.

### 10.6 Review & lock-in (Step 6)

- **Volume panel:** every major muscle group with a horizontal bar against its landmarks, plus whole-block totals (built ahead of M8; see 10.2).
- **Day cards:** day name, ordered exercises with sets × reps @ RIR, and estimated duration.
- **Warnings list:** every `BELOW_MV` and `EXCEEDS_MRV` muscle (focus-based `MAINTENANCE` warnings return with priorities).
- **Lock-in button:** opens a confirmation dialog stating that the structure will be frozen for the block. It asks for `start_date` in calendar mode and requires an "I understand" checkbox if warnings exist.

### 10.7 Estimated session duration

For each day: `5 min warm-up + Σ over slots of target_sets × (45 s work + rest)` where rest = 150 s for `compound`, 90 s for `isolation`. Display rounded to the nearest 5 minutes. Put the constants in `packages/shared`.

### 10.8 Quick copy

From a day's menu: **Duplicate as new day** (numbered cycles, up to 10 days) inserts a copy immediately to the right of the source, scrolls it into view and focuses its name for an inline rename; default name `"<source name> (copy)"` (a generated name becomes the next "Day N"). **Copy exercises to** appends copies of all the day's exercises, with all metrics, to another day. Both happen locally and autosave.

### 10.9 Validation and UX rules

- Sets: integer 1–10. Reps: min ≥ 1, min < max ≤ 50. RIR: 0–5. Weight: ≥ 0, max 2 decimals.
- Cannot remove or clear a day silently if it contains slots: show a confirm dialog with the count.
- Show a "Saving… / Saved / Save failed — retry" indicator for autosave. On failure, keep local state and retry with backoff.
- Empty states: an empty column is labelled "Rest day" and shows only its "+ Add" button.
- Accessibility: all interactive elements reachable by keyboard; visible focus; color contrast meets WCAG AA; announce drag results to screen readers.

---

## 11. Testing requirements

**Unit (Vitest):** volume engine (Sections 7.6 and 7.7), set-attribution, duration estimate, `RirRampStrategy`, lock-in date generation, Zod schemas.

**API integration:** each endpoint, success and error paths, including: `409` on locked mesocycles, `404` on another user's resource, atomic rollback if lock-in fails halfway, and `PUT /schedule` idempotency.

**End-to-end (Playwright), minimum:**
1. Create a mesocycle, add exercises (several at once), edit metrics, and confirm volume chips change.
2. Drag a card from column 1 to column 3 and confirm metrics are preserved and volumes recomputed.
3. Duplicate "Push A" into "Push B" (numbered cycle) and confirm the cards and metrics copied; in a Mon–Sun week, copy a day's exercises into another day.
4. Push a muscle over MRV and confirm the chip turns red and lock-in requires acknowledgement.
5. Lock in and confirm the weekly sessions exist with the correct RIR ramp.
6. At a 390 px viewport, confirm horizontal scrolling works and the page body does not scroll sideways.

---

## 12. Milestones (give to Codex one at a time)

**M0 — Scaffolding.** Monorepo, tooling, CI script, Prisma schema + first migration, empty app, health route.
*Done when:* `pnpm install && pnpm db:migrate && pnpm dev` works; lint/typecheck/test pass.

**M1 — Shared schemas and volume engine.** `packages/shared` (enums, Zod schemas, constants) and `packages/volume-engine` with full tests.
*Done when:* every test in Section 7.7 passes with ≥ 95% coverage on the engine.

**M2 — Seed data and catalog API.** Landmarks, ≥ 90 exercises, `GET/POST /exercises`, `GET /muscle-landmarks`.
*Done when:* seed is idempotent; filtering and search work; duplicate custom names return `409`.

**M3 — Mesocycle API.** Create/list/get/patch/delete, `PUT /schedule`, `validate-volume`, `duplicate-day`. No lock yet.
*Done when:* integration tests for Section 6 (excluding lock) pass.

**M4 — Builder UI shell.** Pages, wizard stepper, create-mesocycle form, Step 1 (days) and Step 2 (muscles and priorities), autosave indicator.
*Done when:* a user can create a draft, define days and muscle groups, reload, and see everything restored.

**M5 — Horizontal board and exercises.** Board, DayColumn, ExerciseCard, catalog panel, custom exercise form, inline metric editing, move up/down. No drag-and-drop yet.
*Done when:* e2e scenario 1 passes; the body never scrolls sideways.

**M6 — Volume bar.** Sticky VolumeBar, chips, popovers, priority target bands, ARIA labels.
*Done when:* chips update synchronously on every edit; colors match Section 7.4.

**M7 — Drag and drop and duplicate.** dnd-kit reorder, cross-column move with edge auto-scroll, keyboard alternatives, duplicate-day UI.
*Done when:* e2e scenarios 2 and 3 pass.

**M8 — Review and lock-in.** Review dashboard, duration estimates, lock endpoint, session generation, read-only view.
*Done when:* e2e scenarios 4 and 5 pass; lock-in is atomic.

**M9 — Hardening.** Mobile pass (scenario 6), accessibility audit, error and empty states, README with setup instructions.
*Done when:* all e2e pass; Lighthouse accessibility ≥ 95 on the builder page.

---

## 13. Risks and things for the human reviewer to check

- **Volume numbers:** Landmarks are generic defaults; individuals vary. Review them before sharing the app.
- **Secondary muscle weighting (0.5):** It's a simplification. Confirm it matches your intent, and change `SECONDARY_MUSCLE_WEIGHT` if not.
- **Drag-and-drop accessibility:** A common failure point. Verify the keyboard path manually.
- **Client/server drift:** Prevented only if both import `packages/volume-engine`. Reject any PR that reimplements volume math.
- **Locking semantics:** Locking is irreversible in v1. Decide whether you want an "unlock/clone as new draft" feature next.
