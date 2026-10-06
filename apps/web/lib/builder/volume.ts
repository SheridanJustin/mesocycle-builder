import { MUSCLES, type Muscle, type MuscleLandmarkList, type VolumeSummary } from '@mesocycle/shared';
import { computeVolume, type ExerciseInfo, type Landmarks } from '@mesocycle/volume-engine';
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

// Runs the shared engine locally so the volume bar updates synchronously on every edit.
export function computeBuilderVolume(state: BuilderState, landmarks: Landmarks): VolumeSummary {
  const exercises: Record<string, ExerciseInfo> = {};
  const slots = state.days.flatMap((day) =>
    day.slots.map((slot) => {
      exercises[slot.exercise.id] = {
        id: slot.exercise.id,
        primary: slot.exercise.primary_muscle,
        secondary: slot.exercise.secondary_muscles,
      };
      return { exerciseId: slot.exercise.id, sets: slot.sets, dayId: day.id };
    }),
  );
  return computeVolume(slots, exercises, landmarks, state.priorities);
}

export type Contribution = { dayName: string; exerciseName: string; sets: number; role: 'primary' | 'secondary' };

// Lists what feeds a muscle (for the chip popover). It reports raw sets only; weighting is the engine's job.
export function contributionsFor(state: BuilderState, muscle: Muscle): Contribution[] {
  return state.days.flatMap((day) =>
    day.slots.flatMap((slot): Contribution[] => {
      const { exercise } = slot;
      if (exercise.primary_muscle === muscle) {
        return [{ dayName: day.name, exerciseName: exercise.name, sets: slot.sets, role: 'primary' }];
      }
      if (exercise.secondary_muscles.includes(muscle)) {
        return [{ dayName: day.name, exerciseName: exercise.name, sets: slot.sets, role: 'secondary' }];
      }
      return [];
    }),
  );
}
