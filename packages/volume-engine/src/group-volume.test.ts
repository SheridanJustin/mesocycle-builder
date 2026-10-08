import { describe, expect, it } from 'vitest';
import { computeBlockVolume, computeGroupVolume, deloadSets, groupLandmarks, lockWarnings } from './group-volume';
import { LANDMARKS } from './test-fixtures';
import type { ExerciseInfo } from './types';

const EX: Record<string, ExerciseInfo> = {
  bench: { id: 'bench', primary: 'chest', secondary: ['front_delts', 'triceps'] },
  pullup: { id: 'pullup', primary: 'lats', secondary: ['biceps', 'upper_back'] },
  row: { id: 'row', primary: 'upper_back', secondary: ['lats', 'biceps', 'rear_delts'] },
  lateral: { id: 'lateral', primary: 'side_delts', secondary: [] },
  ohp: { id: 'ohp', primary: 'front_delts', secondary: ['triceps', 'side_delts'] },
  curl: { id: 'curl', primary: 'biceps', secondary: ['forearms'] },
  wrist: { id: 'wrist', primary: 'forearms', secondary: [] },
  squat: { id: 'squat', primary: 'quads', secondary: ['glutes'] },
};

describe('groupLandmarks', () => {
  const g = groupLandmarks(LANDMARKS);

  it('takes the highest member landmarks for merged groups', () => {
    // back = lats (8,10,14,22,25), upper back (6,8,12,20,25), traps (0,0,12,20,26)
    expect(g.back).toEqual({ mv: 8, mev: 10, mavLow: 14, mavHigh: 22, mrv: 26 });
    // shoulders = front (0,0,6,8,12), side (0,8,16,22,26), rear (0,6,16,22,26)
    expect(g.shoulders).toEqual({ mv: 0, mev: 8, mavLow: 16, mavHigh: 22, mrv: 26 });
    // biceps + forearms
    expect(g.biceps).toEqual(LANDMARKS.biceps);
  });

  it('keeps single-muscle groups unchanged', () => {
    expect(g.chest).toEqual(LANDMARKS.chest);
    expect(g.calves).toEqual(LANDMARKS.calves);
  });

  it('throws when a muscle has no landmarks', () => {
    const { traps: _omitted, ...partial } = LANDMARKS;
    void _omitted;
    expect(() => groupLandmarks(partial as typeof LANDMARKS)).toThrow('Missing landmarks for muscle: traps');
  });
});

describe('computeGroupVolume', () => {
  const compute = (slots: { exerciseId: string; sets: number; dayId?: string }[]) => computeGroupVolume(slots, EX, LANDMARKS);

  it('returns an empty summary for no slots', () => {
    expect(compute([])).toEqual({ summary: {} });
  });

  it('counts a group once per exercise, even when several of its muscles are involved', () => {
    // Pull-up: lats (primary) and upper back (secondary) are both back -> 4 sets, not 6.
    const { summary } = compute([{ exerciseId: 'pullup', sets: 4 }]);
    expect(summary.back?.total_sets).toBe(4);
    expect(summary.biceps?.total_sets).toBe(2);
    expect(Object.keys(summary)).toEqual(['back', 'biceps']);
  });

  it('adds secondary groups at half weight', () => {
    const { summary } = compute([{ exerciseId: 'bench', sets: 4 }]);
    expect(summary).toMatchObject({ chest: { total_sets: 4 }, shoulders: { total_sets: 2 }, triceps: { total_sets: 2 } });
  });

  it('merges delts into shoulders and forearms into biceps', () => {
    const { summary } = compute([
      { exerciseId: 'lateral', sets: 4 },
      { exerciseId: 'ohp', sets: 3 },
      { exerciseId: 'curl', sets: 3 },
      { exerciseId: 'wrist', sets: 2 },
    ]);
    // OHP's side-delt secondary is the same group as its primary, so it adds nothing extra.
    expect(summary.shoulders?.total_sets).toBe(7);
    expect(summary.biceps?.total_sets).toBe(5);
    expect(summary.triceps?.total_sets).toBe(1.5);
  });

  it('applies the group landmarks, status and color', () => {
    const { summary } = compute([
      { exerciseId: 'pullup', sets: 6 },
      { exerciseId: 'row', sets: 6 },
    ]);
    // 12 back sets: above MEV (10), below MAV (14)
    expect(summary.back).toMatchObject({
      total_sets: 12,
      status: 'ABOVE_MEV',
      color: 'lightgreen',
      landmarks: { mv: 8, mev: 10, mav_low: 14, mav_high: 22, mrv: 26 },
    });
    // Row's rear-delt secondary reaches shoulders: 3 sets with mv 0, mev 8 -> maintenance.
    expect(summary.shoulders).toMatchObject({ total_sets: 3, status: 'MAINTENANCE' });
  });

  it('counts frequency as distinct days with a direct set for the group', () => {
    const { summary } = compute([
      { exerciseId: 'pullup', sets: 3, dayId: 'mon' },
      { exerciseId: 'row', sets: 3, dayId: 'thu' },
      { exerciseId: 'curl', sets: 0, dayId: 'fri' },
      { exerciseId: 'bench', sets: 3, dayId: 'fri' },
    ]);
    expect(summary.back?.weekly_frequency).toBe(2);
    expect(summary.biceps?.weekly_frequency).toBe(0); // only secondary or zero-set work
    expect(summary.shoulders?.weekly_frequency).toBe(0);
  });

  it('keeps full precision internally and rounds for display', () => {
    const { summary } = computeGroupVolume([{ exerciseId: 'bench', sets: 3 }], EX, LANDMARKS, { secondaryWeight: 0.3 });
    expect(summary.triceps?.exact_total_sets).toBeCloseTo(0.9, 10);
    expect(summary.triceps?.total_sets).toBe(1);
  });

  it('rejects unknown exercises and invalid sets', () => {
    expect(() => compute([{ exerciseId: 'nope', sets: 3 }])).toThrow('Unknown exercise: nope');
    expect(() => compute([{ exerciseId: 'bench', sets: -1 }])).toThrow(RangeError);
    expect(() => compute([{ exerciseId: 'bench', sets: Number.NaN }])).toThrow(RangeError);
  });
});

describe('deloadSets', () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [10, 5],
  ])('%i -> %i', (sets, expected) => {
    expect(deloadSets(sets)).toBe(expected);
  });
});

describe('computeBlockVolume', () => {
  const slots = [
    { exerciseId: 'bench', sets: 3 },
    { exerciseId: 'bench', sets: 5 },
  ];

  it('multiplies weekly sets by the number of weeks without a deload', () => {
    expect(computeBlockVolume(slots, EX, { weeks: 4, deloadFinalWeek: false })).toEqual({
      chest: { weekly: 8, block: 32 },
      shoulders: { weekly: 4, block: 16 },
      triceps: { weekly: 4, block: 16 },
    });
  });

  it('counts the deload week at half sets, rounded up per slot', () => {
    // Deload: ceil(3/2) + ceil(5/2) = 2 + 3 = 5 chest sets; secondaries at half: 2.5.
    const block = computeBlockVolume(slots, EX, { weeks: 5, deloadFinalWeek: true });
    expect(block.chest).toEqual({ weekly: 8, block: 8 * 4 + 5 });
    expect(block.triceps).toEqual({ weekly: 4, block: 4 * 4 + 2.5 });
  });

  it('returns nothing for no slots and rejects a bad week count', () => {
    expect(computeBlockVolume([], EX, { weeks: 4, deloadFinalWeek: true })).toEqual({});
    expect(() => computeBlockVolume(slots, EX, { weeks: 0, deloadFinalWeek: false })).toThrow(RangeError);
  });
});

describe('lockWarnings', () => {
  it('lists trained groups below MV or above MRV, in group order', () => {
    const volume = computeGroupVolume(
      [
        { exerciseId: 'squat', sets: 30, dayId: 'a' },
        { exerciseId: 'bench', sets: 2, dayId: 'a' },
        { exerciseId: 'lateral', sets: 12, dayId: 'a' },
      ],
      EX,
      LANDMARKS,
    );
    expect(lockWarnings(volume)).toEqual([
      { group: 'chest', status: 'BELOW_MV', totalSets: 2 },
      { group: 'triceps', status: 'BELOW_MV', totalSets: 1 },
      { group: 'quads', status: 'EXCEEDS_MRV', totalSets: 30 },
    ]);
  });

  it('is empty for a balanced or empty week', () => {
    expect(lockWarnings({ summary: {} })).toEqual([]);
    expect(lockWarnings(computeGroupVolume([{ exerciseId: 'bench', sets: 12, dayId: 'a' }], EX, LANDMARKS))).toEqual([]);
  });
});
