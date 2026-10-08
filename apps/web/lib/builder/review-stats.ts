import { estimateSessionMinutes } from '@mesocycle/shared';
import { deloadSets } from '@mesocycle/volume-engine';
import type { BuilderState } from './types';

export type ReviewDay = { name: string; exercises: number; sets: number; minutes: number };

export type ReviewStats = {
  trainingDays: ReviewDay[];
  restDays: string[];
  weeklySets: number;
  deloadWeekSets: number;
  averageMinutes: number;
};

// The Review summary tiles: training and rest days, weekly sets and session-length estimates (SPEC 10.7).
export function computeReviewStats(state: BuilderState): ReviewStats {
  const training = state.days.filter((d) => d.slots.length > 0);
  const trainingDays: ReviewDay[] = training.map((day) => ({
    name: day.name,
    exercises: day.slots.length,
    sets: day.slots.reduce((sum, slot) => sum + slot.sets, 0),
    minutes: estimateSessionMinutes(day.slots.map((slot) => ({ sets: slot.sets, movementType: slot.exercise.movement_type }))),
  }));
  return {
    trainingDays,
    restDays: state.days.filter((d) => d.slots.length === 0).map((d) => d.name),
    weeklySets: trainingDays.reduce((sum, day) => sum + day.sets, 0),
    deloadWeekSets: training.reduce((sum, day) => sum + day.slots.reduce((s, slot) => s + deloadSets(slot.sets), 0), 0),
    averageMinutes: trainingDays.length ? Math.round(trainingDays.reduce((sum, day) => sum + day.minutes, 0) / trainingDays.length / 5) * 5 : 0,
  };
}
