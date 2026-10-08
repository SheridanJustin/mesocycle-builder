import type { WorkoutExercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { formatSet, placeholders, resolveEntry, setRows, type Draft } from './workout-entry';

function exercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    exercise: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Barbell Bench Press',
      primary_muscle: 'chest',
      secondary_muscles: [],
      equipment_type: 'barbell',
      movement_type: 'compound',
      is_custom: false,
    },
    target_sets: 3,
    rep_range_min: 8,
    rep_range_max: 12,
    target_rir: 2,
    target_weight: null,
    sets: [],
    previous: null,
    best: null,
    ...overrides,
  };
}

const empty: Draft = { weight: '', reps: '' };
const withPrevious = exercise({
  previous: {
    date: '2026-10-01',
    sets: [
      { set_number: 1, weight: 100, reps: 8 },
      { set_number: 2, weight: 100, reps: 7 },
    ],
  },
});

describe('setRows', () => {
  it('has a row per planned set with the previous workout matched by set number', () => {
    const rows = setRows(withPrevious, 0);
    expect(rows.map((r) => [r.setNumber, r.previous?.reps, r.removable])).toEqual([
      [1, 8, false],
      [2, 7, false],
      [3, 7, false],
    ]);
  });

  it('keeps logged sets beyond the plan and adds removable extra rows', () => {
    const rows = setRows(exercise({ sets: [{ set_number: 4, weight: 50, reps: 10, records: [] }] }), 1);
    expect(rows.map((r) => [r.setNumber, r.logged !== null, r.removable])).toEqual([
      [1, false, false],
      [2, false, false],
      [3, false, false],
      [4, true, false],
      [5, false, true],
    ]);
  });
});

describe('placeholders', () => {
  it('shows the previous numbers, else the planned weight and rep range', () => {
    expect(placeholders(setRows(withPrevious, 0)[1]!, withPrevious)).toEqual({ weight: '100', reps: '7' });
    const planned = exercise({ target_weight: 62.5 });
    expect(placeholders(setRows(planned, 0)[0]!, planned)).toEqual({ weight: '62.5', reps: '8–12' });
  });
});

describe('resolveEntry', () => {
  const row = setRows(withPrevious, 0)[0]!;

  it('uses the placeholders for empty fields (one tap repeats last workout)', () => {
    expect(resolveEntry(empty, row, withPrevious)).toEqual({ ok: true, value: { weight: 100, reps: 8 } });
  });

  it('takes typed numbers, a decimal comma and BW', () => {
    expect(resolveEntry({ weight: '102,5', reps: '6' }, row, withPrevious)).toEqual({ ok: true, value: { weight: 102.5, reps: 6 } });
    expect(resolveEntry({ weight: 'bw', reps: '12' }, row, withPrevious)).toEqual({ ok: true, value: { weight: null, reps: 12 } });
  });

  it('needs reps when there is no previous workout', () => {
    const first = exercise();
    expect(resolveEntry(empty, setRows(first, 0)[0]!, first)).toMatchObject({ ok: false, field: 'reps' });
    expect(resolveEntry({ weight: '', reps: '10' }, setRows(first, 0)[0]!, first)).toEqual({ ok: true, value: { weight: null, reps: 10 } });
  });

  it.each([
    [{ weight: 'abc', reps: '8' }, 'weight'],
    [{ weight: '60.125', reps: '8' }, 'weight'],
    [{ weight: '60', reps: '0' }, 'reps'],
    [{ weight: '60', reps: '7.5' }, 'reps'],
    [{ weight: '60', reps: '101' }, 'reps'],
  ])('rejects %j', (draft, field) => {
    expect(resolveEntry(draft, row, withPrevious)).toMatchObject({ ok: false, field });
  });
});

describe('formatSet', () => {
  it('formats weighted and bodyweight sets', () => {
    expect(formatSet({ weight: 62.5, reps: 8 })).toBe('62.5 × 8');
    expect(formatSet({ weight: null, reps: 12 })).toBe('BW × 12');
  });
});
