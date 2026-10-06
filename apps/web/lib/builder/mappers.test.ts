import { MesocycleDetailSchema, PutScheduleSchema, type Exercise, type MesocycleDetail } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { detailToState, stateToSchedule } from './mappers';
import { createDay, createSlot } from './reducer';
import type { BuilderState } from './types';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function exercise(n: number, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return {
    id: uuid(n),
    name: `Ex ${n}`,
    primary_muscle: primary,
    secondary_muscles: ['triceps'],
    equipment_type: 'cable',
    movement_type: 'isolation',
    is_custom: false,
  };
}

const state: BuilderState = {
  days: [
    {
      ...createDay('d1', 'Push A'),
      weekday: 2,
      muscles: ['chest', 'triceps'],
      slots: [
        { ...createSlot(exercise(1), 'chest', 's1'), sets: 4, repMin: 6, repMax: 10, rir: 2, weight: 102.5 },
        createSlot(exercise(2, 'triceps'), 'triceps', 's2'),
      ],
    },
    { ...createDay('d2', 'Legs'), muscles: ['quads'] },
  ],
  priorities: { chest: 'focus', triceps: 'maintenance' },
};

describe('stateToSchedule', () => {
  it('produces a body the PUT schema accepts', () => {
    expect(PutScheduleSchema.safeParse(stateToSchedule(state)).success).toBe(true);
  });

  it('uses array order as 1-based sort_order and day_number', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(state));
    expect(body.days.map((d) => [d.day_number, d.sort_order, d.day_name, d.weekday])).toEqual([
      [1, 1, 'Push A', 2],
      [2, 2, 'Legs', null],
    ]);
    expect(body.days[0]?.slots.map((s) => [s.client_id, s.sort_order, s.muscle])).toEqual([
      ['s1', 1, 'chest'],
      ['s2', 2, 'triceps'],
    ]);
    expect(body.days[0]?.muscle_groups).toEqual([
      { muscle: 'chest', sort_order: 1 },
      { muscle: 'triceps', sort_order: 2 },
    ]);
  });

  it('maps metrics and priorities', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(state));
    expect(body.days[0]?.slots[0]).toMatchObject({
      exercise_id: uuid(1),
      target_sets: 4,
      rep_range_min: 6,
      rep_range_max: 10,
      target_rir: 2,
      starting_weight: 102.5,
    });
    expect(body.priorities).toEqual([
      { muscle: 'chest', priority: 'focus' },
      { muscle: 'triceps', priority: 'maintenance' },
    ]);
  });

  it('produces an invalid body when state is invalid (blank day name, bad rep range)', () => {
    const bad: BuilderState = { ...state, days: [{ ...state.days[0]!, name: ' ' }] };
    expect(PutScheduleSchema.safeParse(stateToSchedule(bad)).success).toBe(false);
    const badReps: BuilderState = {
      ...state,
      days: [{ ...state.days[0]!, slots: [{ ...state.days[0]!.slots[0]!, repMin: 12, repMax: 12 }] }],
    };
    expect(PutScheduleSchema.safeParse(stateToSchedule(badReps)).success).toBe(false);
  });
});

describe('detailToState', () => {
  const detail: MesocycleDetail = MesocycleDetailSchema.parse({
    id: uuid(99),
    name: 'Block',
    duration_weeks: 4,
    days_per_week: 2,
    schedule_mode: 'relative',
    status: 'draft',
    start_date: null,
    locked_at: null,
    deload_final_week: false,
    created_at: '2026-10-06T00:00:00.000Z',
    updated_at: '2026-10-06T00:00:00.000Z',
    days: [
      {
        id: uuid(10),
        day_number: 1,
        weekday: null,
        day_name: 'Push A',
        sort_order: 1,
        muscle_groups: [{ id: uuid(20), muscle: 'chest', sort_order: 1 }],
        slots: [
          {
            id: uuid(30),
            muscle: 'chest',
            exercise_id: uuid(1),
            exercise: exercise(1),
            sort_order: 1,
            target_sets: 4,
            rep_range_min: 6,
            rep_range_max: 10,
            target_rir: 2,
            starting_weight: 102.5,
          },
        ],
      },
    ],
    priorities: [{ muscle: 'chest', priority: 'focus' }],
    volume_summary: { summary: {} },
  });

  it('maps server data into client state with fresh client ids', () => {
    const result = detailToState(detail);
    expect(result.days[0]).toMatchObject({ name: 'Push A', muscles: ['chest'] });
    expect(result.days[0]?.slots[0]).toMatchObject({ sets: 4, repMin: 6, repMax: 10, rir: 2, weight: 102.5 });
    expect(result.days[0]?.id).not.toBe(uuid(10));
    expect(result.priorities).toEqual({ chest: 'focus' });
  });

  it('round-trips through stateToSchedule', () => {
    const body = PutScheduleSchema.parse(stateToSchedule(detailToState(detail)));
    expect(body.days[0]?.slots[0]).toMatchObject({ exercise_id: uuid(1), target_sets: 4, starting_weight: 102.5 });
    expect(body.priorities).toEqual([{ muscle: 'chest', priority: 'focus' }]);
  });
});
