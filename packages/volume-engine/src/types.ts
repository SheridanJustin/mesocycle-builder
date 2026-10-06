import type { Muscle, Priority } from '@mesocycle/shared';

export type ExerciseInfo = { id: string; primary: Muscle; secondary: Muscle[] };

// `dayId` drives weekly_frequency. Slots without one share a single anonymous day.
export type SlotInput = { exerciseId: string; sets: number; dayId?: string };

export type MuscleLandmarks = { mv: number; mev: number; mavLow: number; mavHigh: number; mrv: number };
export type Landmarks = Record<Muscle, MuscleLandmarks>;
export type Priorities = Partial<Record<Muscle, Priority>>;

export type ComputeVolumeOptions = {
  // Weight of a set toward each secondary muscle. Defaults to SECONDARY_MUSCLE_WEIGHT.
  secondaryWeight?: number;
  // Muscles assigned to a day. They appear in the summary even with zero sets.
  assignedMuscles?: readonly Muscle[];
};
