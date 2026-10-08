import { describe, expect, it } from 'vitest';
import { bestSet, estimatedOneRepMax, LogSetSchema, placeholderSet, summarizeRecords, workoutRecords } from './workout';

describe('estimatedOneRepMax', () => {
  it('uses Epley and rounds to 0.1', () => {
    expect(estimatedOneRepMax({ weight: 100, reps: 5 })).toBe(116.7);
    expect(estimatedOneRepMax({ weight: 60, reps: 10 })).toBe(80);
  });
  it('is the weight itself for a single rep', () => {
    expect(estimatedOneRepMax({ weight: 140, reps: 1 })).toBe(140);
  });
  it('is 0 without weight', () => {
    expect(estimatedOneRepMax({ weight: null, reps: 12 })).toBe(0);
    expect(estimatedOneRepMax({ weight: 0, reps: 12 })).toBe(0);
  });
});

describe('placeholderSet', () => {
  const previous = [
    { set_number: 1, weight: 100, reps: 8 },
    { set_number: 2, weight: 100, reps: 7 },
  ];
  it('takes the same set number', () => {
    expect(placeholderSet(previous, 2)).toEqual({ set_number: 2, weight: 100, reps: 7 });
  });
  it('falls back to the last set when the previous workout had fewer sets', () => {
    expect(placeholderSet(previous, 4)).toEqual({ set_number: 2, weight: 100, reps: 7 });
  });
  it('is null without a previous workout', () => {
    expect(placeholderSet([], 1)).toBeNull();
  });
});

describe('workoutRecords', () => {
  const history = [
    { weight: 100, reps: 8 },
    { weight: 105, reps: 5 },
  ];

  it('marks nothing the first time an exercise is logged', () => {
    expect(workoutRecords([], [{ set_number: 1, weight: 100, reps: 8 }]).size).toBe(0);
  });

  it('marks a heavier set as a weight and estimated 1RM record', () => {
    const records = workoutRecords(history, [
      { set_number: 1, weight: 100, reps: 8 },
      { set_number: 2, weight: 110, reps: 5 },
    ]);
    expect(records.get(2)).toEqual(['e1rm', 'weight']);
    expect(records.has(1)).toBe(false);
  });

  it('marks more reps at the same weight as an estimated 1RM record only', () => {
    const records = workoutRecords(history, [{ set_number: 1, weight: 100, reps: 10 }]);
    expect(records.get(1)).toEqual(['e1rm']);
  });

  it('gives each kind to one set only (the first of equal sets)', () => {
    const records = workoutRecords(history, [
      { set_number: 1, weight: 110, reps: 6 },
      { set_number: 2, weight: 110, reps: 6 },
    ]);
    expect([...records.keys()]).toEqual([1]);
  });

  it('marks no record when matching the best', () => {
    expect(workoutRecords(history, [{ set_number: 1, weight: 105, reps: 5 }]).size).toBe(0);
  });

  it('compares bodyweight sets by reps', () => {
    const records = workoutRecords([{ weight: null, reps: 10 }], [
      { set_number: 1, weight: null, reps: 12 },
      { set_number: 2, weight: null, reps: 9 },
    ]);
    expect(records.get(1)).toEqual(['reps']);
  });
});

describe('summarizeRecords', () => {
  it('finds the best estimated 1RM, the heaviest set and the most bodyweight reps', () => {
    const summary = summarizeRecords([
      { weight: 100, reps: 10, date: '2026-01-05' },
      { weight: 120, reps: 2, date: '2026-01-12' },
      { weight: 120, reps: 3, date: '2026-01-19' },
      { weight: null, reps: 15, date: '2026-01-19' },
    ]);
    expect(summary.best_e1rm).toEqual({ weight: 100, reps: 10, e1rm: 133.3, date: '2026-01-05' });
    expect(summary.heaviest).toEqual({ weight: 120, reps: 3, e1rm: 132, date: '2026-01-19' });
    expect(summary.most_reps).toMatchObject({ reps: 15, weight: null });
  });

  it('bestSet prefers the estimated 1RM and falls back to reps', () => {
    expect(bestSet([{ weight: null, reps: 12, date: 'd' }])).toMatchObject({ reps: 12 });
    expect(bestSet([])).toBeNull();
  });
});

describe('LogSetSchema', () => {
  it('accepts a weight with up to 2 decimals or none', () => {
    expect(LogSetSchema.safeParse({ weight: 62.25, reps: 8 }).success).toBe(true);
    expect(LogSetSchema.safeParse({ weight: null, reps: 12 }).success).toBe(true);
  });
  it('rejects zero reps, too many decimals and negative weight', () => {
    expect(LogSetSchema.safeParse({ weight: 60, reps: 0 }).success).toBe(false);
    expect(LogSetSchema.safeParse({ weight: 60.125, reps: 8 }).success).toBe(false);
    expect(LogSetSchema.safeParse({ weight: -5, reps: 8 }).success).toBe(false);
  });
});
