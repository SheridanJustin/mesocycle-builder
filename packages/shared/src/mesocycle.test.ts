import { describe, expect, it } from 'vitest';
import {
  CreateMesocycleSchema,
  DuplicateDaySchema,
  LockMesocycleSchema,
  MesocycleDetailSchema,
  MesocycleSummarySchema,
  PatchMesocycleSchema,
  PutScheduleSchema,
  ScheduleSlotSchema,
  WeightSchema,
} from './mesocycle';

const exerciseId = 'e3b0c442-98fc-4c14-9afb-f4c8996fb924';

function slot(overrides: Record<string, unknown> = {}) {
  return { client_id: 'tmp-1', muscle: 'chest', exercise_id: exerciseId, sort_order: 1, ...overrides };
}

function day(overrides: Record<string, unknown> = {}) {
  return {
    day_number: 1,
    day_name: 'Push A',
    sort_order: 1,
    muscle_groups: [{ muscle: 'chest', sort_order: 1 }],
    slots: [slot()],
    ...overrides,
  };
}

describe('CreateMesocycleSchema', () => {
  it('defaults to an untitled 4-week, 7-day Mon-Sun block', () => {
    expect(CreateMesocycleSchema.parse({})).toEqual({
      name: 'Untitled block',
      duration_weeks: 4,
      days_per_week: 7,
      schedule_mode: 'calendar',
    });
  });

  it('accepts numbered cycles of 1 to 10 days', () => {
    for (const days_per_week of [1, 8, 10]) {
      expect(CreateMesocycleSchema.safeParse({ days_per_week, schedule_mode: 'relative' }).success).toBe(true);
    }
  });

  it.each([0, 11])('rejects days_per_week %i', (days_per_week) => {
    expect(CreateMesocycleSchema.safeParse({ days_per_week, schedule_mode: 'relative' }).success).toBe(false);
  });

  it('needs exactly 7 days for weekday names', () => {
    expect(CreateMesocycleSchema.safeParse({ days_per_week: 5 }).success).toBe(false);
    expect(CreateMesocycleSchema.safeParse({ days_per_week: 5, schedule_mode: 'calendar' }).success).toBe(false);
  });

  it.each([3, 7])('rejects duration_weeks %i', (duration_weeks) => {
    expect(CreateMesocycleSchema.safeParse({ duration_weeks }).success).toBe(false);
  });

  it('rejects a blank name', () => {
    expect(CreateMesocycleSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});

describe('PatchMesocycleSchema', () => {
  it('requires at least one field', () => {
    expect(PatchMesocycleSchema.safeParse({}).success).toBe(false);
    expect(PatchMesocycleSchema.safeParse({ deload_final_week: true }).success).toBe(true);
  });
});

describe('WeightSchema', () => {
  it.each([0, 185, 185.5, 185.25, 185.1])('accepts %s', (value) => {
    expect(WeightSchema.safeParse(value).success).toBe(true);
  });

  it.each([-1, 185.123, 10000])('rejects %s', (value) => {
    expect(WeightSchema.safeParse(value).success).toBe(false);
  });
});

describe('ScheduleSlotSchema', () => {
  it('applies the default metrics (3 sets, 8-12 reps, RIR 3, no weight)', () => {
    expect(ScheduleSlotSchema.parse(slot())).toMatchObject({
      target_sets: 3,
      rep_range_min: 8,
      rep_range_max: 12,
      target_rir: 3,
      starting_weight: null,
    });
  });

  it.each([
    ['target_sets', 0],
    ['target_sets', 11],
    ['target_rir', -1],
    ['target_rir', 6],
    ['rep_range_min', 0],
    ['rep_range_max', 51],
    ['starting_weight', -5],
  ])('rejects %s = %s', (field, value) => {
    expect(ScheduleSlotSchema.safeParse(slot({ [field]: value })).success).toBe(false);
  });

  it('requires rep_range_min < rep_range_max', () => {
    expect(ScheduleSlotSchema.safeParse(slot({ rep_range_min: 12, rep_range_max: 12 })).success).toBe(false);
    expect(ScheduleSlotSchema.safeParse(slot({ rep_range_min: 5, rep_range_max: 10 })).success).toBe(true);
  });
});

describe('PutScheduleSchema', () => {
  it('accepts a valid schedule and defaults priorities', () => {
    const parsed = PutScheduleSchema.parse({ days: [day()] });
    expect(parsed.priorities).toEqual([]);
    expect(parsed.days[0]?.weekday).toBeNull();
  });

  it('accepts 1 to 10 days', () => {
    const days = Array.from({ length: 11 }, (_, i) => day({ day_number: Math.min(i + 1, 10), sort_order: i }));
    expect(PutScheduleSchema.safeParse({ days }).success).toBe(false);
    expect(PutScheduleSchema.safeParse({ days: days.slice(0, 10) }).success).toBe(true);
    expect(PutScheduleSchema.safeParse({ days: [] }).success).toBe(false);
  });

  it('accepts an optional schedule_mode', () => {
    expect(PutScheduleSchema.parse({ days: [day()], schedule_mode: 'relative' }).schedule_mode).toBe('relative');
    expect(PutScheduleSchema.parse({ days: [day()] }).schedule_mode).toBeUndefined();
    expect(PutScheduleSchema.safeParse({ days: [day()], schedule_mode: 'weekly' }).success).toBe(false);
  });

  it('rejects a slot whose muscle has no group on the same day', () => {
    const result = PutScheduleSchema.safeParse({ days: [day({ slots: [slot({ muscle: 'triceps' })] })] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['days', 0, 'slots', 0, 'muscle']);
  });

  it('rejects duplicate muscle groups, slot sort orders and client ids within a day', () => {
    const group = { muscle: 'chest', sort_order: 1 };
    expect(PutScheduleSchema.safeParse({ days: [day({ muscle_groups: [group, group] })] }).success).toBe(false);
    expect(
      PutScheduleSchema.safeParse({ days: [day({ slots: [slot(), slot({ client_id: 'tmp-2' })] })] }).success,
    ).toBe(false);
    expect(
      PutScheduleSchema.safeParse({ days: [day({ slots: [slot(), slot({ sort_order: 2 })] })] }).success,
    ).toBe(false);
  });

  it('allows the same slot sort_order on different days', () => {
    const days = [day(), day({ day_number: 2, day_name: 'Push B', sort_order: 2 })];
    expect(PutScheduleSchema.safeParse({ days }).success).toBe(true);
  });

  it('rejects duplicate day sort orders and duplicate priorities', () => {
    expect(PutScheduleSchema.safeParse({ days: [day(), day({ day_number: 2 })] }).success).toBe(false);
    const priorities = [
      { muscle: 'chest', priority: 'focus' },
      { muscle: 'chest', priority: 'normal' },
    ];
    expect(PutScheduleSchema.safeParse({ days: [day()], priorities }).success).toBe(false);
  });

  it('rejects day names over 50 characters', () => {
    expect(PutScheduleSchema.safeParse({ days: [day({ day_name: 'x'.repeat(51) })] }).success).toBe(false);
  });
});

describe('DuplicateDaySchema', () => {
  it('validates position bounds', () => {
    const base = { source_day_id: exerciseId };
    expect(DuplicateDaySchema.safeParse({ ...base, target_position: 5, new_name: 'Push B' }).success).toBe(true);
    expect(DuplicateDaySchema.safeParse({ ...base, target_position: 0 }).success).toBe(false);
    expect(DuplicateDaySchema.safeParse({ ...base, target_position: 10 }).success).toBe(true);
    expect(DuplicateDaySchema.safeParse({ ...base, target_position: 11 }).success).toBe(false);
  });
});

describe('LockMesocycleSchema', () => {
  it('defaults acknowledge_warnings to false', () => {
    expect(LockMesocycleSchema.parse({}).acknowledge_warnings).toBe(false);
  });

  it('accepts real ISO dates only', () => {
    expect(LockMesocycleSchema.safeParse({ start_date: '2026-10-05' }).success).toBe(true);
    expect(LockMesocycleSchema.safeParse({ start_date: '2026-02-30' }).success).toBe(false);
    expect(LockMesocycleSchema.safeParse({ start_date: '10/05/2026' }).success).toBe(false);
  });
});

describe('response schemas', () => {
  const summary = {
    id: exerciseId,
    name: 'Block',
    duration_weeks: 4,
    days_per_week: 4,
    schedule_mode: 'relative',
    status: 'draft',
    start_date: null,
    locked_at: null,
    deload_final_week: false,
    created_at: '2026-10-06T00:00:00.000Z',
    updated_at: '2026-10-06T00:00:00.000Z',
  };

  it('accepts a summary and a detail with empty days', () => {
    expect(MesocycleSummarySchema.safeParse({ ...summary, day_count: 4 }).success).toBe(true);
    expect(
      MesocycleDetailSchema.safeParse({ ...summary, days: [], priorities: [], volume_summary: { summary: {} } }).success,
    ).toBe(true);
  });

  it('rejects an unknown status and a malformed start_date', () => {
    expect(MesocycleSummarySchema.safeParse({ ...summary, day_count: 1, status: 'locked' }).success).toBe(false);
    expect(MesocycleSummarySchema.safeParse({ ...summary, day_count: 1, start_date: '10/05/2026' }).success).toBe(false);
  });
});
