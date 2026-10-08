import { MAX_LOGGED_REPS, MAX_LOGGED_SETS, MAX_LOGGED_WEIGHT, placeholderSet, type LogSet, type LoggedSet, type WorkoutExercise } from '@mesocycle/shared';

// The workout logger's input rules (SPEC decision 19): what a row shows and what ✓ saves.

export type SetValues = { weight: number | null; reps: number };
export type Draft = { weight: string; reps: string };

export type SetRow = {
  setNumber: number;
  logged: LoggedSet | null;
  // The previous workout's matching set: shown in the Previous column and used as placeholders.
  previous: SetValues | null;
  // A set added beyond the plan that is not logged yet (it can be removed).
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

// The rows of one exercise: the planned sets, any logged beyond them, and `extra` added rows.
export function setRows(exercise: WorkoutExercise, extra: number): SetRow[] {
  const lastLogged = Math.max(0, ...exercise.sets.map((set) => set.set_number));
  const count = Math.min(MAX_LOGGED_SETS, Math.max(exercise.target_sets, lastLogged) + extra);
  const previous = exercise.previous?.sets ?? [];
  return Array.from({ length: count }, (_, index) => {
    const setNumber = index + 1;
    const logged = exercise.sets.find((set) => set.set_number === setNumber) ?? null;
    const match = placeholderSet(previous, setNumber);
    return {
      setNumber,
      logged,
      previous: match ? { weight: match.weight, reps: match.reps } : null,
      removable: !logged && setNumber > Math.max(exercise.target_sets, lastLogged),
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
