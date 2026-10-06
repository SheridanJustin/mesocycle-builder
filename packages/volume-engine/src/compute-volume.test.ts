import { describe, expect, it } from 'vitest';
import { computeVolume } from './compute-volume';
import { EXERCISES, LANDMARKS } from './test-fixtures';
import type { SlotInput } from './types';

const compute = (slots: SlotInput[], priorities = {}, opts = {}) =>
  computeVolume(slots, EXERCISES, LANDMARKS, priorities, opts);

describe('empty input', () => {
  it('returns an empty summary', () => {
    expect(compute([])).toEqual({ summary: {} });
  });
});

describe('set attribution', () => {
  it('counts 1.0 toward the primary and 0.5 toward each secondary muscle', () => {
    const { summary } = compute([{ exerciseId: 'bench', sets: 4 }]);
    expect(summary.chest?.total_sets).toBe(4);
    expect(summary.front_delts?.total_sets).toBe(2);
    expect(summary.triceps?.total_sets).toBe(2);
  });

  it('handles exercises with no secondary muscles', () => {
    const { summary } = compute([{ exerciseId: 'fly', sets: 3 }]);
    expect(Object.keys(summary)).toEqual(['chest']);
    expect(summary.chest?.total_sets).toBe(3);
  });

  it('sums sets across slots and days', () => {
    const { summary } = compute([
      { exerciseId: 'bench', sets: 3, dayId: 'a' },
      { exerciseId: 'fly', sets: 3, dayId: 'a' },
      { exerciseId: 'bench', sets: 2, dayId: 'b' },
    ]);
    expect(summary.chest?.total_sets).toBe(8);
    expect(summary.triceps?.total_sets).toBe(2.5);
  });

  it('adds direct and indirect sets to the same muscle', () => {
    const { summary } = compute([
      { exerciseId: 'bench', sets: 4 },
      { exerciseId: 'pushdown', sets: 3 },
    ]);
    expect(summary.triceps?.total_sets).toBe(5);
  });

  it('honors a custom secondary weight', () => {
    const { summary } = compute([{ exerciseId: 'bench', sets: 4 }], {}, { secondaryWeight: 0.25 });
    expect(summary.triceps?.total_sets).toBe(1);
    expect(compute([{ exerciseId: 'bench', sets: 4 }], {}, { secondaryWeight: 0 }).summary.triceps?.total_sets).toBe(0);
  });

  it('ignores duplicate secondaries and a primary listed as secondary', () => {
    const { summary } = compute([{ exerciseId: 'odd', sets: 4 }]);
    expect(summary.chest?.total_sets).toBe(4);
    expect(summary.triceps?.total_sets).toBe(2);
  });

  it('emits muscles in canonical order', () => {
    const { summary } = compute([
      { exerciseId: 'squat', sets: 2 },
      { exerciseId: 'bench', sets: 2 },
    ]);
    expect(Object.keys(summary)).toEqual(['chest', 'front_delts', 'triceps', 'quads', 'glutes']);
  });
});

describe('zero-set muscles', () => {
  it('omits muscles with no sets unless assigned', () => {
    const { summary } = compute([{ exerciseId: 'fly', sets: 3 }]);
    expect(summary.quads).toBeUndefined();
  });

  it('shows assigned muscles with total 0 and BELOW_MV when mv > 0', () => {
    const { summary } = compute([], {}, { assignedMuscles: ['chest'] });
    expect(summary.chest).toMatchObject({ total_sets: 0, weekly_frequency: 0, status: 'BELOW_MV', color: 'amber' });
  });

  it('shows assigned muscles with mv == 0 as ABOVE_MEV', () => {
    const { summary } = compute([], {}, { assignedMuscles: ['glutes'] });
    expect(summary.glutes?.status).toBe('ABOVE_MEV');
  });

  it('does not duplicate an assigned muscle that also has sets', () => {
    const { summary } = compute([{ exerciseId: 'fly', sets: 12 }], {}, { assignedMuscles: ['chest'] });
    expect(summary.chest?.total_sets).toBe(12);
  });
});

describe('weekly frequency', () => {
  it('counts distinct days with at least one direct set', () => {
    const { summary } = compute([
      { exerciseId: 'bench', sets: 3, dayId: 'mon' },
      { exerciseId: 'fly', sets: 3, dayId: 'mon' },
      { exerciseId: 'bench', sets: 3, dayId: 'thu' },
    ]);
    expect(summary.chest?.weekly_frequency).toBe(2);
  });

  it('does not count secondary-only days', () => {
    const { summary } = compute([
      { exerciseId: 'pushdown', sets: 3, dayId: 'mon' },
      { exerciseId: 'bench', sets: 3, dayId: 'tue' },
    ]);
    expect(summary.triceps?.weekly_frequency).toBe(1);
    expect(summary.front_delts?.weekly_frequency).toBe(0);
  });

  it('does not count slots with zero sets', () => {
    const { summary } = compute([
      { exerciseId: 'fly', sets: 0, dayId: 'mon' },
      { exerciseId: 'fly', sets: 3, dayId: 'tue' },
    ]);
    expect(summary.chest?.weekly_frequency).toBe(1);
  });

  it('treats slots without a day id as one shared day', () => {
    const { summary } = compute([
      { exerciseId: 'bench', sets: 3 },
      { exerciseId: 'fly', sets: 3 },
    ]);
    expect(summary.chest?.weekly_frequency).toBe(1);
  });
});

describe('priorities', () => {
  const slots: SlotInput[] = [{ exerciseId: 'fly', sets: 12 }];

  it('defaults to normal', () => {
    expect(compute(slots).summary.chest).toMatchObject({ priority: 'normal', target_band: { low: 10, high: 16 } });
  });

  it.each([
    ['focus', { low: 16, high: 20 }],
    ['normal', { low: 10, high: 16 }],
    ['maintenance', { low: 8, high: 10 }],
  ] as const)('%s sets the target band', (priority, band) => {
    expect(compute(slots, { chest: priority }).summary.chest).toMatchObject({ priority, target_band: band });
  });

  it('never changes status or color', () => {
    const colors = (['focus', 'normal', 'maintenance'] as const).map((priority) => {
      const chest = compute(slots, { chest: priority }).summary.chest;
      return [chest?.status, chest?.color];
    });
    expect(new Set(colors.map((c) => c.join())).size).toBe(1);
  });

  it('hints how far a focus muscle is under its band', () => {
    expect(compute(slots, { chest: 'focus' }).summary.chest?.message).toContain('Focus muscle is 4 sets under its target band.');
  });
});

describe('status in the summary', () => {
  it('computes status and color from the exact total', () => {
    const { summary } = compute([{ exerciseId: 'fly', sets: 12 }]);
    expect(summary.chest).toMatchObject({
      status: 'MAV',
      color: 'green',
      landmarks: { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 },
    });
  });

  it('flags EXCEEDS_MRV in red', () => {
    const { summary } = compute([{ exerciseId: 'fly', sets: 23 }]);
    expect(summary.chest).toMatchObject({ status: 'EXCEEDS_MRV', color: 'red' });
  });
});

describe('fractional totals', () => {
  it('rounds the displayed total to 0.5 but keeps full precision', () => {
    const { summary } = compute([{ exerciseId: 'bench', sets: 3 }], {}, { secondaryWeight: 0.3 });
    expect(summary.triceps?.exact_total_sets).toBeCloseTo(0.9, 10);
    expect(summary.triceps?.total_sets).toBe(1);
  });

  it('classifies on the exact total, not the rounded one', () => {
    // 11.9 rounds to 12 for display but is still below mav_low (12).
    const exercises = { x: { id: 'x', primary: 'abs' as const, secondary: ['chest' as const] } };
    const { summary } = computeVolume([{ exerciseId: 'x', sets: 10 }], exercises, LANDMARKS, {}, { secondaryWeight: 1.19 });
    expect(summary.chest?.exact_total_sets).toBeCloseTo(11.9, 10);
    expect(summary.chest?.total_sets).toBe(12);
    expect(summary.chest?.status).toBe('ABOVE_MEV');
  });
});

describe('invalid input', () => {
  it('throws on an unknown exercise', () => {
    expect(() => compute([{ exerciseId: 'nope', sets: 3 }])).toThrow('Unknown exercise: nope');
  });

  it('throws on negative or non-finite sets', () => {
    expect(() => compute([{ exerciseId: 'fly', sets: -1 }])).toThrow(RangeError);
    expect(() => compute([{ exerciseId: 'fly', sets: Number.NaN }])).toThrow(RangeError);
  });

  it('throws on an invalid secondary weight', () => {
    expect(() => compute([], {}, { secondaryWeight: -0.5 })).toThrow(RangeError);
    expect(() => compute([], {}, { secondaryWeight: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });

  it('throws when landmarks are missing for an included muscle', () => {
    const { chest: _omitted, ...partial } = LANDMARKS;
    void _omitted;
    expect(() =>
      computeVolume([{ exerciseId: 'fly', sets: 3 }], EXERCISES, partial as unknown as typeof LANDMARKS, {}),
    ).toThrow('Missing landmarks for muscle: chest');
  });
});
