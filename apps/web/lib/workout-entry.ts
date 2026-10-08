import { MAX_LOGGED_REPS, MAX_LOGGED_SETS, MAX_LOGGED_WEIGHT, placeholderSet, type LogSet, type LoggedSet, type WorkoutExercise } from '@mesocycle/shared';

// The workout logger's input rules (SPEC decision 19): what a row shows and what ✓ saves.

export type SetValues = { weight: number | null; reps: number };
export type Draft = { weight: string; reps: string };

export type SetRow = {
  setNumber: number;
  logged: LoggedSet | null;
  // The previous workout's matching set: shown in the Previous column and used as placeholders.
  previous: SetValues | null;
  // A set that is not logged and not the only one (removing it changes the plan, SPEC decision 20).
  removable: boolean;
};

// "62.5", "100" (no trailing zeros).
export function formatWeight(weight: number): string {
  return String(Math.round(weight * 100) / 100);
}

// "100 × 8"; a set without weight is "BW × 12" (bodyweight).
export function formatSet({ weight, reps }: SetValues): string {
  return `${weight !== null && weight > 0 ? formatWeight(weight) : 'BW'} × ${reps}`;
}

// The rows of one exercise: its planned sets (and any logged beyond them).
export function setRows(exercise: WorkoutExercise): SetRow[] {
  const lastLogged = Math.max(0, ...exercise.sets.map((set) => set.set_number));
  const count = Math.min(MAX_LOGGED_SETS, Math.max(exercise.target_sets, lastLogged));
  const previous = exercise.previous?.sets ?? [];
  return Array.from({ length: count }, (_, index) => {
    const setNumber = index + 1;
    const logged = exercise.sets.find((set) => set.set_number === setNumber) ?? null;
    const match = placeholderSet(previous, setNumber);
    return {
      setNumber,
      logged,
      previous: match ? { weight: match.weight, reps: match.reps } : null,
      removable: !logged && count > 1,
    };
  });
}

// The placeholders of a row: the previous workout's numbers, else the planned weight and rep range.
export function placeholders(row: SetRow, exercise: WorkoutExercise): Draft {
  const weight = row.previous ? row.previous.weight : exercise.target_weight;
  return {
    weight: weight !== null && weight > 0 ? formatWeight(weight) : row.previous ? 'BW' : '',
    reps: row.previous ? String(row.previous.reps) : `${exercise.rep_range_min}–${exercise.rep_range_max}`,
  };
}

type Resolved = { ok: true; value: LogSet } | { ok: false; field: 'weight' | 'reps'; message: string };

// What ✓ saves: the typed numbers, or the placeholders for empty fields (so repeating last
// workout is one tap). Accepts a decimal comma ("62,5").
export function resolveEntry(draft: Draft, row: SetRow, exercise: WorkoutExercise): Resolved {
  const weightText = draft.weight.trim().replace(',', '.');
  let weight: number | null;
  if (weightText === '') {
    weight = row.previous ? row.previous.weight : exercise.target_weight;
  } else if (/^bw$/i.test(weightText)) {
    weight = null;
  } else {
    weight = Number(weightText);
    if (!/^\d+(\.\d{1,2})?$/.test(weightText) || weight > MAX_LOGGED_WEIGHT) {
      return { ok: false, field: 'weight', message: `Enter a weight from 0 to ${MAX_LOGGED_WEIGHT} (up to 2 decimals)` };
    }
  }

  const repsText = draft.reps.trim();
  let reps: number;
  if (repsText === '') {
    if (!row.previous) return { ok: false, field: 'reps', message: 'Enter the reps you did' };
    reps = row.previous.reps;
  } else {
    reps = Number(repsText);
    if (!/^\d+$/.test(repsText) || reps < 1 || reps > MAX_LOGGED_REPS) {
      return { ok: false, field: 'reps', message: `Enter reps from 1 to ${MAX_LOGGED_REPS}` };
    }
  }
  return { ok: true, value: { weight, reps } };
}

export const RECORD_LABEL: Record<LoggedSet['records'][number], string> = {
  e1rm: 'best estimated 1RM',
  weight: 'heaviest weight',
  reps: 'most reps',
};

// Sets of a workout that are not logged (they count as not done), and how many of those have
// numbers typed but not ticked.
export function emptySets(exercises: readonly WorkoutExercise[], drafts: Readonly<Record<string, Draft>>): { empty: number; typed: number } {
  let empty = 0;
  let typed = 0;
  for (const exercise of exercises) {
    for (const row of setRows(exercise)) {
      if (row.logged) continue;
      empty += 1;
      const draft = drafts[`${exercise.id}:${row.setNumber}`];
      if (draft && (draft.weight.trim() || draft.reps.trim())) typed += 1;
    }
  }
  return { empty, typed };
}

// "Week 3", "Weeks 2–4" or "Weeks 2, 4 and 5": where a set change carried over to.
export function weeksLabel(weeks: readonly number[]): string {
  if (weeks.length === 1) return `Week ${weeks[0]}`;
  const consecutive = weeks.every((week, i) => i === 0 || week === weeks[i - 1]! + 1);
  if (consecutive) return `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
  return `Weeks ${weeks.slice(0, -1).join(', ')} and ${weeks[weeks.length - 1]}`;
}
