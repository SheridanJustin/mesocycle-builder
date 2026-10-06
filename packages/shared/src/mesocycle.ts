import { z } from 'zod';
import {
  DEFAULT_REP_RANGE_MAX,
  DEFAULT_REP_RANGE_MIN,
  DEFAULT_RIR,
  DEFAULT_SLOT_SETS,
  MAX_DAY_NAME_LENGTH,
  DEFAULT_CYCLE_DAYS,
  DEFAULT_MESOCYCLE_NAME,
  MAX_CYCLE_DAYS,
  MAX_DURATION_WEEKS,
  MAX_REPS,
  MAX_RIR,
  MAX_SETS,
  MIN_CYCLE_DAYS,
  MIN_DURATION_WEEKS,
  MIN_REPS,
  MIN_RIR,
  MIN_SETS,
  WEEK_DAYS,
} from './constants';
import { MesocycleStatusSchema, MuscleSchema, PrioritySchema, ScheduleModeSchema } from './enums';
import { ExerciseSchema } from './exercise';
import { VolumeSummarySchema } from './volume';

const mesocycleName = z.string().trim().min(1).max(255);
const durationWeeks = z.number().int().min(MIN_DURATION_WEEKS).max(MAX_DURATION_WEEKS);
const dayName = z.string().trim().min(1).max(MAX_DAY_NAME_LENGTH);
const weekday = z.number().int().min(0).max(6); // 0 = Monday

function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export const WeightSchema = z
  .number()
  .min(0)
  .max(9999.99)
  .refine(hasAtMostTwoDecimals, { message: 'Must have at most 2 decimal places' });

// Every field is optional: "New mesocycle" creates a 7-day Mon-Sun draft named "Untitled mesocycle".
export const CreateMesocycleSchema = z
  .object({
    name: mesocycleName.default(DEFAULT_MESOCYCLE_NAME),
    duration_weeks: durationWeeks.default(4),
    days_per_week: z.number().int().min(MIN_CYCLE_DAYS).max(MAX_CYCLE_DAYS).default(DEFAULT_CYCLE_DAYS),
    schedule_mode: ScheduleModeSchema.default('calendar'),
  })
  .refine((value) => value.schedule_mode !== 'calendar' || value.days_per_week === WEEK_DAYS, {
    message: `Weekday names (calendar mode) need exactly ${WEEK_DAYS} days`,
    path: ['days_per_week'],
  });
export type CreateMesocycle = z.infer<typeof CreateMesocycleSchema>;

export const PatchMesocycleSchema = z
  .object({
    name: mesocycleName.optional(),
    duration_weeks: durationWeeks.optional(),
    deload_final_week: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });
export type PatchMesocycle = z.infer<typeof PatchMesocycleSchema>;

export const ScheduleMuscleGroupSchema = z.object({
  muscle: MuscleSchema,
  sort_order: z.number().int().min(0),
});

export const ScheduleSlotSchema = z
  .object({
    client_id: z.string().min(1),
    muscle: MuscleSchema,
    exercise_id: z.string().uuid(),
    sort_order: z.number().int().min(0),
    target_sets: z.number().int().min(MIN_SETS).max(MAX_SETS).default(DEFAULT_SLOT_SETS),
    rep_range_min: z.number().int().min(MIN_REPS).default(DEFAULT_REP_RANGE_MIN),
    rep_range_max: z.number().int().max(MAX_REPS).default(DEFAULT_REP_RANGE_MAX),
    target_rir: z.number().int().min(MIN_RIR).max(MAX_RIR).default(DEFAULT_RIR),
    starting_weight: WeightSchema.nullable().default(null),
  })
  .refine((slot) => slot.rep_range_min < slot.rep_range_max, {
    message: 'rep_range_min must be less than rep_range_max',
    path: ['rep_range_min'],
  });
export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

function findDuplicate<T>(values: readonly T[]): number {
  const seen = new Set<T>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) return index;
    seen.add(value);
  }
  return -1;
}

export const ScheduleDaySchema = z
  .object({
    day_number: z.number().int().min(1).max(MAX_CYCLE_DAYS),
    weekday: weekday.nullable().default(null),
    day_name: dayName,
    sort_order: z.number().int().min(0),
    muscle_groups: z.array(ScheduleMuscleGroupSchema),
    slots: z.array(ScheduleSlotSchema),
  })
  .superRefine((day, ctx) => {
    const duplicateGroup = findDuplicate(day.muscle_groups.map((g) => g.muscle));
    if (duplicateGroup !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['muscle_groups', duplicateGroup, 'muscle'],
        message: 'Muscle group already exists on this day',
      });
    }
    const groups = new Set(day.muscle_groups.map((g) => g.muscle));
    for (const [index, slot] of day.slots.entries()) {
      if (!groups.has(slot.muscle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['slots', index, 'muscle'],
          message: 'Slot muscle must reference a muscle group on the same day',
        });
      }
    }
    // Slot order is global across the day, so it must be unique per day (SPEC 5.2).
    const duplicateOrder = findDuplicate(day.slots.map((s) => s.sort_order));
    if (duplicateOrder !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slots', duplicateOrder, 'sort_order'],
        message: 'sort_order must be unique within the day',
      });
    }
    const duplicateClientId = findDuplicate(day.slots.map((s) => s.client_id));
    if (duplicateClientId !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slots', duplicateClientId, 'client_id'],
        message: 'client_id must be unique within the day',
      });
    }
  });
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

export const PutScheduleSchema = z
  .object({
    days: z.array(ScheduleDaySchema).min(MIN_CYCLE_DAYS).max(MAX_CYCLE_DAYS),
    // Saved together with the days so labels and weekdays always change atomically.
    schedule_mode: ScheduleModeSchema.optional(),
    priorities: z.array(z.object({ muscle: MuscleSchema, priority: PrioritySchema })).default([]),
  })
  .superRefine((schedule, ctx) => {
    const duplicateOrder = findDuplicate(schedule.days.map((d) => d.sort_order));
    if (duplicateOrder !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['days', duplicateOrder, 'sort_order'],
        message: 'sort_order must be unique across days',
      });
    }
    const duplicatePriority = findDuplicate(schedule.priorities.map((p) => p.muscle));
    if (duplicatePriority !== -1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priorities', duplicatePriority, 'muscle'],
        message: 'Duplicate priority for muscle',
      });
    }
  });
export type PutSchedule = z.infer<typeof PutScheduleSchema>;

export const DuplicateDaySchema = z.object({
  source_day_id: z.string().uuid(),
  target_position: z.number().int().min(1).max(MAX_CYCLE_DAYS),
  new_name: dayName.optional(),
});
export type DuplicateDay = z.infer<typeof DuplicateDaySchema>;

function isRealIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine(isRealIsoDate, { message: 'Must be a real date' });

export const LockMesocycleSchema = z.object({
  start_date: isoDate.optional(),
  acknowledge_warnings: z.boolean().default(false),
});
export type LockMesocycle = z.infer<typeof LockMesocycleSchema>;

// ---- Responses ----

export const MesocycleSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  duration_weeks: z.number().int(),
  // Length of the repeating cycle (1-10 days, rest days included). Kept equal to days.length.
  days_per_week: z.number().int(),
  schedule_mode: ScheduleModeSchema,
  status: MesocycleStatusSchema,
  start_date: isoDate.nullable(),
  locked_at: z.string().nullable(),
  deload_final_week: z.boolean(),
  day_count: z.number().int().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MesocycleSummary = z.infer<typeof MesocycleSummarySchema>;

export const MesocycleListSchema = z.object({ items: z.array(MesocycleSummarySchema) });
export type MesocycleList = z.infer<typeof MesocycleListSchema>;

export const SlotDetailSchema = z.object({
  id: z.string().uuid(),
  muscle: MuscleSchema,
  exercise_id: z.string().uuid(),
  exercise: ExerciseSchema,
  sort_order: z.number().int(),
  target_sets: z.number().int(),
  rep_range_min: z.number().int(),
  rep_range_max: z.number().int(),
  target_rir: z.number().int(),
  starting_weight: z.number().nullable(),
});
export type SlotDetail = z.infer<typeof SlotDetailSchema>;

export const DayDetailSchema = z.object({
  id: z.string().uuid(),
  day_number: z.number().int(),
  weekday: z.number().int().nullable(),
  day_name: z.string(),
  sort_order: z.number().int(),
  muscle_groups: z.array(z.object({ id: z.string().uuid(), muscle: MuscleSchema, sort_order: z.number().int() })),
  slots: z.array(SlotDetailSchema),
});
export type DayDetail = z.infer<typeof DayDetailSchema>;

export const MesocycleDetailSchema = MesocycleSummarySchema.omit({ day_count: true }).extend({
  days: z.array(DayDetailSchema),
  // Only muscles with a stored priority; every other muscle is 'normal'.
  priorities: z.array(z.object({ muscle: MuscleSchema, priority: PrioritySchema })),
  volume_summary: VolumeSummarySchema,
});
export type MesocycleDetail = z.infer<typeof MesocycleDetailSchema>;
