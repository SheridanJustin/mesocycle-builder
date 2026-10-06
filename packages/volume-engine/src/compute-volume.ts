import {
  MUSCLES,
  SECONDARY_MUSCLE_WEIGHT,
  type Muscle,
  type MuscleVolume,
  type VolumeSummary,
} from '@mesocycle/shared';
import { roundToHalf, statusColor, targetBand, volumeMessage, volumeStatus } from './status';
import type { ComputeVolumeOptions, ExerciseInfo, Landmarks, Priorities, SlotInput } from './types';

const ANONYMOUS_DAY = '\u0000no-day';

export function computeVolume(
  slots: readonly SlotInput[],
  exercises: Readonly<Record<string, ExerciseInfo>>,
  landmarks: Landmarks,
  priorities: Priorities,
  opts: ComputeVolumeOptions = {},
): VolumeSummary {
  const secondaryWeight = opts.secondaryWeight ?? SECONDARY_MUSCLE_WEIGHT;
  if (!Number.isFinite(secondaryWeight) || secondaryWeight < 0) {
    throw new RangeError(`secondaryWeight must be a non-negative number, got ${secondaryWeight}`);
  }

  const totals = new Map<Muscle, number>();
  const directDays = new Map<Muscle, Set<string>>();

  for (const slot of slots) {
    if (!Number.isFinite(slot.sets) || slot.sets < 0) {
      throw new RangeError(`Slot for exercise ${slot.exerciseId} has invalid sets: ${slot.sets}`);
    }
    const exercise = exercises[slot.exerciseId];
    if (!exercise) throw new Error(`Unknown exercise: ${slot.exerciseId}`);

    totals.set(exercise.primary, (totals.get(exercise.primary) ?? 0) + slot.sets);
    if (slot.sets > 0) {
      const days = directDays.get(exercise.primary) ?? new Set<string>();
      days.add(slot.dayId ?? ANONYMOUS_DAY);
      directDays.set(exercise.primary, days);
    }
    // Dedupe, and never double count a primary muscle listed as secondary.
    for (const muscle of new Set(exercise.secondary)) {
      if (muscle === exercise.primary) continue;
      totals.set(muscle, (totals.get(muscle) ?? 0) + slot.sets * secondaryWeight);
    }
  }

  const included = new Set<Muscle>([...totals.keys(), ...(opts.assignedMuscles ?? [])]);
  const summary: VolumeSummary['summary'] = {};

  // Emit in MUSCLES order so output is deterministic.
  for (const muscle of MUSCLES) {
    if (!included.has(muscle)) continue;
    const muscleLandmarks = landmarks[muscle];
    if (!muscleLandmarks) throw new Error(`Missing landmarks for muscle: ${muscle}`);

    const exact = totals.get(muscle) ?? 0;
    const priority = priorities[muscle] ?? 'normal';
    const status = volumeStatus(exact, muscleLandmarks);
    const band = targetBand(priority, muscleLandmarks);
    const entry: MuscleVolume = {
      total_sets: roundToHalf(exact),
      exact_total_sets: exact,
      weekly_frequency: directDays.get(muscle)?.size ?? 0,
      status,
      landmarks: {
        mv: muscleLandmarks.mv,
        mev: muscleLandmarks.mev,
        mav_low: muscleLandmarks.mavLow,
        mav_high: muscleLandmarks.mavHigh,
        mrv: muscleLandmarks.mrv,
      },
      priority,
      target_band: band,
      color: statusColor(status),
      message: volumeMessage(status, exact, priority, band),
    };
    summary[muscle] = entry;
  }

  return { summary };
}
