import { MAX_REPS, MAX_RIR, MAX_SETS, MIN_REPS, MIN_RIR, MIN_SETS, type ScheduleMode, type VolumeSummary } from '@mesocycle/shared';
import type { BuilderSlot, BuilderState } from './types';

export const STEP_LABELS = ['Schedule', 'Muscles', 'Exercises', 'Metrics', 'Volume', 'Review'] as const;
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export function isValidSlotMetrics(slot: BuilderSlot): boolean {
  const isInt = Number.isInteger;
  return (
    isInt(slot.sets) &&
    slot.sets >= MIN_SETS &&
    slot.sets <= MAX_SETS &&
    isInt(slot.repMin) &&
    isInt(slot.repMax) &&
    slot.repMin >= MIN_REPS &&
    slot.repMin < slot.repMax &&
    slot.repMax <= MAX_REPS &&
    isInt(slot.rir) &&
    slot.rir >= MIN_RIR &&
    slot.rir <= MAX_RIR &&
    (slot.weight === null || slot.weight >= 0)
  );
}

// Completion rules from SPEC 10.2. Steps 4 and 5 also need at least one exercise, so they do not
// show a check on an empty board.
export function stepCompletion(
  state: BuilderState,
  mode: ScheduleMode,
  volume: VolumeSummary,
  reviewOpened: boolean,
): Record<StepNumber, boolean> {
  const { days } = state;
  const slots = days.flatMap((day) => day.slots);

  const weekdays = days.map((day) => day.weekday);
  const scheduleOk =
    days.length > 0 &&
    days.every((day) => day.name.trim().length > 0) &&
    (mode !== 'calendar' || (weekdays.every((w) => w !== null) && new Set(weekdays).size === weekdays.length));

  const musclesOk = days.length > 0 && days.every((day) => day.muscles.length > 0);
  const exercisesOk =
    musclesOk && days.every((day) => day.muscles.every((muscle) => day.slots.some((slot) => slot.muscle === muscle)));
  const metricsOk = slots.length > 0 && slots.every(isValidSlotMetrics);
  const volumeOk = slots.length > 0 && Object.values(volume.summary).every((entry) => entry?.status !== 'EXCEEDS_MRV');

  return { 1: scheduleOk, 2: musclesOk, 3: exercisesOk, 4: metricsOk, 5: volumeOk, 6: reviewOpened };
}
