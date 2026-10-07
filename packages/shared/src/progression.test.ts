import { describe, expect, it } from 'vitest';
import { addDays, isMonday, mondayOf, planWeeks, RirRampStrategy, sessionDate, upcomingMondays, weekdayOf } from './progression';

const slot = { sets: 3, repMin: 8, repMax: 12, rir: 3, weight: 100 };

describe('RirRampStrategy', () => {
  it('keeps sets, reps and weight and drops RIR by one per week, never below 0', () => {
    const rirs = [1, 2, 3, 4, 5, 6].map((week) => RirRampStrategy.apply(slot, week, 6, false));
    expect(rirs.map((t) => t.rir)).toEqual([3, 2, 1, 0, 0, 0]);
    expect(rirs.every((t) => t.sets === 3 && t.repMin === 8 && t.repMax === 12 && t.weight === 100)).toBe(true);
  });

  it('deload: half the sets rounded up, 90% weight, Week 1 RIR, same reps', () => {
    expect(RirRampStrategy.apply(slot, 5, 5, true)).toEqual({ sets: 2, repMin: 8, repMax: 12, rir: 3, weight: 90 });
    expect(RirRampStrategy.apply({ ...slot, sets: 4, weight: 62.5 }, 4, 4, true)).toMatchObject({ sets: 2, weight: 56.25 });
    expect(RirRampStrategy.apply({ ...slot, sets: 1, weight: 33.33 }, 4, 4, true)).toMatchObject({ sets: 1, weight: 30 });
    expect(RirRampStrategy.apply({ ...slot, weight: null }, 4, 4, true).weight).toBeNull();
  });
});

describe('planWeeks', () => {
  it('marks only the final week as deload when asked', () => {
    expect(planWeeks(3, true)).toEqual([
      { weekNumber: 1, isDeload: false },
      { weekNumber: 2, isDeload: false },
      { weekNumber: 3, isDeload: true },
    ]);
    expect(planWeeks(4, false).some((w) => w.isDeload)).toBe(false);
  });
});

describe('dates', () => {
  it('knows weekdays (0 = Monday) and Mondays', () => {
    expect(weekdayOf('2026-10-05')).toBe(0);
    expect(weekdayOf('2026-10-11')).toBe(6);
    expect(isMonday('2026-10-05')).toBe(true);
    expect(isMonday('2026-10-06')).toBe(false);
    expect(mondayOf('2026-10-11')).toBe('2026-10-05');
    expect(mondayOf('2026-10-05')).toBe('2026-10-05');
  });

  it('crosses month and year boundaries', () => {
    expect(sessionDate('2026-09-28', 1, 3)).toBe('2026-10-01');
    expect(sessionDate('2026-12-28', 2, 4)).toBe('2027-01-08');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is not shifted by daylight-saving changes (US: Nov 1 2026, EU: Oct 25 2026, US: Mar 8 2026)', () => {
    expect(sessionDate('2026-10-19', 2, 0)).toBe('2026-10-26');
    expect(sessionDate('2026-10-26', 2, 6)).toBe('2026-11-08');
    expect(sessionDate('2026-03-02', 2, 1)).toBe('2026-03-10');
    // Week N always lands on the same weekday, 7 days apart.
    const mondays = [1, 2, 3, 4, 5, 6, 7, 8].map((week) => sessionDate('2026-10-05', week, 0));
    expect(mondays.every(isMonday)).toBe(true);
  });

  it('lists upcoming Mondays starting with the current week', () => {
    expect(upcomingMondays('2026-10-07', 3)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });
});
