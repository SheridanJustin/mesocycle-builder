import { MesocycleDetailSchema, PutScheduleSchema, type Exercise, type MesocycleDetail } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { detailToState, stateToSchedule } from './mappers';
import { createSlot } from './reducer';
import type { BuilderState } from './types';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function exercise(n: number, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return { id: uuid(n), name: `Ex ${n}`, primary_muscle: primary, secondary_muscles: ['triceps'], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
}

const week: BuilderState = {
  mode: 'calendar',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, i) => ({
    id: `d${i}`,
    name: i === 0 ? 'Push A' : name,
    weekday: i,
    slots:
      i === 0
        ? [
            { ...createSlot(exercise(1), 's1'), sets: 4, repMin: 6, repMax: 10, rir: 2, weight: 102.5 },
            createSlot(exercise(2, 'triceps'), 's2'),
            createSlot(exercise(3), 's3'),
          ]
        : [],
  })),
  priorities: { chest: 'focus' },
};

describe('stateToSchedule', () => {
  it('produces a body the PUT schema accepts, including the mode', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(week));
    expect(body.schedule_mode).toBe('calendar');
    expect(body.days.map((d) => [d.day_number, d.sort_order, d.weekday])).toEqual(
      Array.from({ length: 7 }, (_, i) => [i + 1, i + 1, i]),
    );
  });

  it('derives muscle groups from the exercises, in order of appearance', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(week));
    expect(body.days[0]?.muscle_groups).toEqual([
      { muscle: 'chest', sort_order: 1 },
      { muscle: 'triceps', sort_order: 2 },
    ]);
    expect(body.days[1]?.muscle_groups).toEqual([]);
    expect(body.days[0]?.slots.map((s) => [s.client_id, s.sort_order, s.muscle])).toEqual([
      ['s1', 1, 'chest'],
      ['s2', 2, 'triceps'],
      ['s3', 3, 'chest'],
    ]);
  });

  it('maps metrics and keeps stored priorities', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(week));
    expect(body.days[0]?.slots[0]).toMatchObject({ exercise_id: uuid(1), target_sets: 4, rep_range_min: 6, rep_range_max: 10, target_rir: 2, starting_weight: 102.5 });
    expect(body.priorities).toEqual([{ muscle: 'chest', priority: 'focus' }]);
  });

  it('sends no weekdays for numbered days', () => {
    const body = PutScheduleSchema.parse(stateToSchedule({ ...week, mode: 'relative' }));
    expect(body.schedule_mode).toBe('relative');
    expect(body.days.every((d) => d.weekday === null)).toBe(true);
  });

  it('produces an invalid body for a blank day name or a bad rep range', () => {
    const blank: BuilderState = { ...week, days: [{ ...week.days[0]!, name: ' ' }, ...week.days.slice(1)] };
    expect(PutScheduleSchema.safeParse(stateToSchedule(blank)).success).toBe(false);
    const badReps: BuilderState = {
      ...week,
      days: [{ ...week.days[0]!, slots: [{ ...week.days[0]!.slots[0]!, repMin: 12, repMax: 12 }] }, ...week.days.slice(1)],
    };
    expect(PutScheduleSchema.safeParse(stateToSchedule(badReps)).success).toBe(false);
  });
});

describe('detailToState', () => {
  function detail(mode: 'calendar' | 'relative', dayCount: number): MesocycleDetail {
    return MesocycleDetailSchema.parse({
      id: uuid(99),
      name: 'Block',
      duration_weeks: 4,
      days_per_week: dayCount,
      schedule_mode: mode,
      status: 'draft',
      start_date: null,
      locked_at: null,
      ended_at: null,
      deload_final_week: false,
      created_at: '2026-10-06T00:00:00.000Z',
      updated_at: '2026-10-06T00:00:00.000Z',
      days: Array.from({ length: dayCount }, (_, i) => ({
        id: uuid(10 + i),
        day_number: i + 1,
        weekday: mode === 'calendar' ? i : null,
        day_name: i === 0 ? 'Push A' : `Day ${i + 1}`,
        sort_order: i + 1,
        muscle_groups: i === 0 ? [{ id: uuid(30), muscle: 'chest', sort_order: 1 }] : [],
        slots:
          i === 0
            ? [{ id: uuid(40), muscle: 'chest', exercise_id: uuid(1), exercise: exercise(1), sort_order: 1, target_sets: 4, rep_range_min: 6, rep_range_max: 10, target_rir: 2, starting_weight: 102.5 }]
            : [],
      })),
      priorities: [{ muscle: 'chest', priority: 'focus' }],
      weeks: [],
      volume_summary: { summary: {} },
    });
  }

  it('maps server data into client state with fresh client ids', () => {
    const state = detailToState(detail('calendar', 7));
    expect(state.mode).toBe('calendar');
    expect(state.days).toHaveLength(7);
    expect(state.days[0]).toMatchObject({ name: 'Push A', weekday: 0 });
    expect(state.days[0]?.slots[0]).toMatchObject({ sets: 4, repMin: 6, repMax: 10, rir: 2, weight: 102.5, muscle: 'chest' });
    expect(state.days[0]?.id).not.toBe(uuid(10));
    expect(state.priorities).toEqual({ chest: 'focus' });
  });

  it('shows a calendar draft without exactly 7 days as numbered days', () => {
    const state = detailToState(detail('calendar', 3));
    expect(state.mode).toBe('relative');
    expect(state.days.every((d) => d.weekday === null)).toBe(true);
  });

  it('round-trips through stateToSchedule', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(detailToState(detail('relative', 4))));
    expect(body.days).toHaveLength(4);
    expect(body.days[0]?.slots[0]).toMatchObject({ exercise_id: uuid(1), target_sets: 4, starting_weight: 102.5 });
  });
});
