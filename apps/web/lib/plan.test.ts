import type { MesocycleDetail } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { initialWeek, planDays, progress } from './plan';

type Week = MesocycleDetail['weeks'][number];
const week = (n: number, dates: (string | null)[]): Week => ({
  id: `w${n}`,
  week_number: n,
  is_deload: false,
  is_complete: false,
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

describe('planDays', () => {
  const day = (id: string, name: string, weekday: number | null) => ({
    id,
    day_number: 1,
    weekday,
    day_name: name,
    sort_order: 1,
    muscle_groups: [],
    slots: [],
  });
  const days = [day('mon', 'Mon', 0), day('tue', 'Tue', 1), day('wed', 'Wed', 2)];
  const session = (dayId: string, date: string | null) => ({
    id: `s-${dayId}`,
    day_id: dayId,
    day_name: dayId,
    scheduled_date: date,
    status: 'planned' as const,
    exercises: [],
  });
  const w2 = { id: 'w2', week_number: 2, is_deload: false, is_complete: false, sessions: [session('mon', '2026-10-12'), session('wed', '2026-10-14')] };

  it('includes rest days, in order, with their dates', () => {
    const result = planDays({ days, schedule_mode: 'calendar', start_date: '2026-10-05' }, w2);
    expect(result.map((d) => [d.kind, d.name, d.date])).toEqual([
      ['workout', 'Mon', '2026-10-12'],
      ['rest', 'Tue', '2026-10-13'],
      ['workout', 'Wed', '2026-10-14'],
    ]);
  });

  it('leaves dates empty for numbered cycles', () => {
    const numbered = { ...w2, sessions: [session('mon', null)] };
    const result = planDays({ days, schedule_mode: 'relative', start_date: null }, numbered);
    expect(result.map((d) => [d.kind, d.date])).toEqual([
      ['workout', null],
      ['rest', null],
      ['rest', null],
    ]);
  });
});

describe('progress', () => {
  it('counts completed and skipped workouts', () => {
    const done = week(1, ['2026-10-05', '2026-10-08']);
    done.sessions[0]!.status = 'completed';
    done.sessions[1]!.status = 'skipped';
    expect(progress({ weeks: [done, week(2, ['2026-10-12'])] })).toEqual({ done: 2, total: 3 });
  });
});
