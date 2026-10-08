import { z } from 'zod';
import { MesocycleStatusSchema, WeightUnitSchema } from './enums';
import { ExerciseSchema } from './exercise';
import { SESSION_STATUSES } from './mesocycle';

// Workout logging (SPEC decision 19): the reps and weight of each set, personal bests, and the
// previous workout's numbers as placeholders.

export const MAX_LOGGED_SETS = 20;
export const MAX_LOGGED_REPS = 100;
export const MAX_LOGGED_WEIGHT = 9999.99;

// A set without weight (or 0) is a bodyweight set: its record is the most reps.
export const RECORD_KINDS = ['e1rm', 'weight', 'reps'] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export type SetValues = { weight: number | null; reps: number };

const weight = z
  .number()
  .min(0)
  .max(MAX_LOGGED_WEIGHT)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use at most 2 decimals');

// PUT /session-exercises/{id}/sets/{set_number}
export const LogSetSchema = z.object({
  weight: weight.nullable(),
  reps: z.number().int().min(1).max(MAX_LOGGED_REPS),
});
export type LogSet = z.infer<typeof LogSetSchema>;

export const SetNumberSchema = z.coerce.number().int().min(1).max(MAX_LOGGED_SETS);

const setValues = z.object({ set_number: z.number().int(), weight: z.number().nullable(), reps: z.number().int() });

export const LoggedSetSchema = setValues.extend({
  // Personal records this set broke (only the best set of the workout carries each kind).
  records: z.array(z.enum(RECORD_KINDS)),
});
export type LoggedSet = z.infer<typeof LoggedSetSchema>;

const BestSetSchema = z.object({ weight: z.number().nullable(), reps: z.number().int(), e1rm: z.number(), date: z.string() });

export const WorkoutExerciseSchema = z.object({
  id: z.string().uuid(),
  exercise: ExerciseSchema,
  target_sets: z.number().int(),
  rep_range_min: z.number().int(),
  rep_range_max: z.number().int(),
  target_rir: z.number().int(),
  target_weight: z.number().nullable(),
  sets: z.array(LoggedSetSchema),
  // The last other workout in which this exercise was logged: its sets fill the placeholders.
  previous: z.object({ date: z.string(), sets: z.array(setValues) }).nullable(),
  // The best set before this workout (by estimated 1RM, or reps for bodyweight sets).
  best: BestSetSchema.nullable(),
});
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;

// GET /sessions/{id}/workout
export const WorkoutDetailSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SESSION_STATUSES),
  day_name: z.string(),
  scheduled_date: z.string().nullable(),
  week_number: z.number().int(),
  is_deload: z.boolean(),
  mesocycle: z.object({ id: z.string().uuid(), name: z.string(), status: MesocycleStatusSchema }),
  // Sets can be logged while the mesocycle is active (or completed, to fix a number).
  editable: z.boolean(),
  weight_unit: WeightUnitSchema,
  exercises: z.array(WorkoutExerciseSchema),
});
export type WorkoutDetail = z.infer<typeof WorkoutDetailSchema>;

export const ExerciseRecordSchema = z.object({
  exercise: z.object({ id: z.string().uuid(), name: z.string(), primary_muscle: ExerciseSchema.shape.primary_muscle }),
  best_e1rm: BestSetSchema.nullable(),
  heaviest: BestSetSchema.nullable(),
  most_reps: BestSetSchema.nullable(),
  sets_logged: z.number().int(),
  last_logged: z.string(),
});
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;

// GET /records
export const RecordsSchema = z.object({ weight_unit: WeightUnitSchema, exercises: z.array(ExerciseRecordSchema) });
export type Records = z.infer<typeof RecordsSchema>;

const isWeighted = (set: SetValues) => set.weight !== null && set.weight > 0;

// Epley's estimate of the one-rep max, rounded to 0.1. A single rep is the weight itself; a set
// without weight has none.
export function estimatedOneRepMax({ weight, reps }: SetValues): number {
  if (weight === null || weight <= 0 || reps <= 0) return 0;
  const value = reps === 1 ? weight : weight * (1 + reps / 30);
  return Math.round(value * 10) / 10;
}

// The placeholder of a set: the previous workout's set with the same number, else its last set.
export function placeholderSet<T>(previous: readonly (T & { set_number: number })[], setNumber: number): T | null {
  if (previous.length === 0) return null;
  return previous.find((set) => set.set_number === setNumber) ?? previous[previous.length - 1] ?? null;
}

type Dated = SetValues & { date: string };
type Best = { weight: number | null; reps: number; e1rm: number; date: string };

const withE1rm = (set: Dated): Best => ({ weight: set.weight, reps: set.reps, e1rm: estimatedOneRepMax(set), date: set.date });

// The first set with the highest score (ties keep the earliest).
function top<T>(sets: readonly T[], score: (set: T) => number): T | null {
  let best: T | null = null;
  for (const set of sets) if (best === null || score(set) > score(best)) best = set;
  return best;
}

export type RecordSummary = { best_e1rm: Best | null; heaviest: Best | null; most_reps: Best | null };

// Personal bests of one exercise from its logged sets (in the order they were done).
export function summarizeRecords(sets: readonly Dated[]): RecordSummary {
  const weighted = sets.filter(isWeighted);
  const bodyweight = sets.filter((set) => !isWeighted(set));
  const e1rm = top(weighted, estimatedOneRepMax);
  // Heaviest weight; more reps break a tie.
  const heaviest = top(weighted, (set) => (set.weight ?? 0) * 1000 + set.reps);
  const reps = top(bodyweight, (set) => set.reps);
  return { best_e1rm: e1rm && withE1rm(e1rm), heaviest: heaviest && withE1rm(heaviest), most_reps: reps && withE1rm(reps) };
}

// The best set before a workout: by estimated 1RM, or by reps when only bodyweight sets exist.
export function bestSet(history: readonly Dated[]): Best | null {
  const summary = summarizeRecords(history);
  return summary.best_e1rm ?? summary.most_reps;
}

// Which sets of a workout broke a personal record, compared with every set logged before it.
// Each kind goes to the workout's best set of that kind, so one workout shows at most one badge per
// kind. Nothing is a record the first time an exercise is logged (there is nothing to beat).
export function workoutRecords(history: readonly SetValues[], sets: readonly (SetValues & { set_number: number })[]): Map<number, RecordKind[]> {
  const records = new Map<number, RecordKind[]>();
  const add = (setNumber: number, kind: RecordKind) => records.set(setNumber, [...(records.get(setNumber) ?? []), kind]);

  const weightedHistory = history.filter(isWeighted);
  const bodyweightHistory = history.filter((set) => !isWeighted(set));
  const weighted = sets.filter(isWeighted);
  const bodyweight = sets.filter((set) => !isWeighted(set));

  if (weightedHistory.length > 0) {
    const bestE1rm = Math.max(...weightedHistory.map(estimatedOneRepMax));
    const maxWeight = Math.max(...weightedHistory.map((set) => set.weight ?? 0));
    const e1rm = top(weighted, estimatedOneRepMax);
    if (e1rm && estimatedOneRepMax(e1rm) > bestE1rm) add(e1rm.set_number, 'e1rm');
    const heaviest = top(weighted, (set) => set.weight ?? 0);
    if (heaviest && (heaviest.weight ?? 0) > maxWeight) add(heaviest.set_number, 'weight');
  }
  if (bodyweightHistory.length > 0) {
    const maxReps = Math.max(...bodyweightHistory.map((set) => set.reps));
    const reps = top(bodyweight, (set) => set.reps);
    if (reps && reps.reps > maxReps) add(reps.set_number, 'reps');
  }
  return records;
}
