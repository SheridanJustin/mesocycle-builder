import type { MesocycleDetail } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { initialWeek } from './plan';

type Week = MesocycleDetail['weeks'][number];
const week = (n: number, dates: (string | null)[]): Week => ({
  id: `w${n}`,
  week_number: n,
  is_deload: false,
  sessions: dates.map((d, i) => ({ id: `s${n}${i}`, day_id: 'd', day_name: 'Mon', scheduled_date: d, status: 'planned', exercises: [] })),
});
const weeks = [week(1, ['2026-10-05', '2026-10-08']), week(2, ['2026-10-12', '2026-10-15']), week(3, ['2026-10-19'])];

describe('initialWeek', () => {
  it('opens on the week with the next workout', () => {
    expect(initialWeek({ weeks }, '2026-10-01')).toBe(1);
    expect(initialWeek({ weeks }, '2026-10-08')).toBe(1);
    expect(initialWeek({ weeks }, '2026-10-09')).toBe(2);
    expect(initialWeek({ weeks }, '2026-10-19')).toBe(3);
  });

  it('shows the last week once everything is past, and Week 1 without dates', () => {
    expect(initialWeek({ weeks }, '2026-12-01')).toBe(3);
    expect(initialWeek({ weeks: [week(1, [null]), week(2, [null])] }, '2026-10-01')).toBe(1);
    expect(initialWeek({ weeks: [] }, '2026-10-01')).toBe(1);
  });
});
