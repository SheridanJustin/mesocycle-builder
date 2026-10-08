import { MUSCLE_GROUP_OF, MUSCLES, type GroupVolumeSummary, type MuscleGroup, type MuscleLandmarkList } from '@mesocycle/shared';
import {
  computeBlockVolume,
  computeGroupVolume,
  type BlockVolume,
  type ExerciseInfo,
  type Landmarks,
  type SlotInput,
} from '@mesocycle/volume-engine';
import type { BuilderState } from './types';

export function toEngineLandmarks(list: MuscleLandmarkList): Landmarks {
  const byMuscle = new Map(list.items.map((row) => [row.muscle, row]));
  const entries = MUSCLES.map((muscle) => {
    const row = byMuscle.get(muscle);
    if (!row) throw new Error(`Landmarks missing for ${muscle}`);
    return [muscle, { mv: row.mv, mev: row.mev, mavLow: row.mav_low, mavHigh: row.mav_high, mrv: row.mrv }] as const;
  });
  return Object.fromEntries(entries) as Landmarks;
}

function engineInput(state: BuilderState): { slots: SlotInput[]; exercises: Record<string, ExerciseInfo> } {
  const exercises: Record<string, ExerciseInfo> = {};
  const slots = state.days.flatMap((day) =>
    day.slots.map((slot) => {
      exercises[slot.exercise.id] = { id: slot.exercise.id, primary: slot.exercise.primary_muscle, secondary: slot.exercise.secondary_muscles };
      return { exerciseId: slot.exercise.id, sets: slot.sets, dayId: day.id };
    }),
  );
  return { slots, exercises };
}

// Runs the shared engine locally so the volume bar updates synchronously on every edit.
export function computeBuilderVolume(state: BuilderState, landmarks: Landmarks): GroupVolumeSummary {
  const { slots, exercises } = engineInput(state);
  return computeGroupVolume(slots, exercises, landmarks);
}

export function computeBuilderBlockVolume(state: BuilderState, weeks: number, deloadFinalWeek: boolean): BlockVolume {
  const { slots, exercises } = engineInput(state);
  return computeBlockVolume(slots, exercises, { weeks, deloadFinalWeek });
}

export type Contribution = { dayName: string; exerciseName: string; sets: number; role: 'primary' | 'secondary' };

// Lists what feeds a muscle group (for the chip popover). Raw sets only; weighting is the engine's job.
export function contributionsFor(state: BuilderState, group: MuscleGroup): Contribution[] {
  return state.days.flatMap((day) =>
    day.slots.flatMap((slot): Contribution[] => {
      const { exercise } = slot;
      const base = { dayName: day.name, exerciseName: exercise.name, sets: slot.sets };
      if (MUSCLE_GROUP_OF[exercise.primary_muscle] === group) return [{ ...base, role: 'primary' }];
      if (exercise.secondary_muscles.some((m) => MUSCLE_GROUP_OF[m] === group)) return [{ ...base, role: 'secondary' }];
      return [];
    }),
  );
}
