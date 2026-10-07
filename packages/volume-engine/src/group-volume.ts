import {
  MUSCLE_GROUP_OF,
  MUSCLE_GROUPS,
  MUSCLES,
  SECONDARY_MUSCLE_WEIGHT,
  type GroupVolume,
  type GroupVolumeSummary,
  type MuscleGroup,
} from '@mesocycle/shared';
import { roundToHalf, statusColor, volumeStatus } from './status';
import type { ExerciseInfo, Landmarks, MuscleLandmarks, SlotInput } from './types';

export type GroupLandmarks = Record<MuscleGroup, MuscleLandmarks>;

// A group's landmarks are the highest of its member muscles' landmarks. Merged groups (back,
// shoulders, biceps + forearms) are trained by the same exercises, so their targets do not add up.
export function groupLandmarks(landmarks: Landmarks): GroupLandmarks {
  const result = {} as GroupLandmarks;
  for (const muscle of MUSCLES) {
    const group = MUSCLE_GROUP_OF[muscle];
    const l = landmarks[muscle];
    if (!l) throw new Error(`Missing landmarks for muscle: ${muscle}`);
    const current = result[group];
    result[group] = current
      ? {
          mv: Math.max(current.mv, l.mv),
          mev: Math.max(current.mev, l.mev),
          mavLow: Math.max(current.mavLow, l.mavLow),
          mavHigh: Math.max(current.mavHigh, l.mavHigh),
          mrv: Math.max(current.mrv, l.mrv),
        }
      : { ...l };
  }
  return result;
}

// Deload week sets (SPEC 9.3): half the Week 1 sets, rounded up.
export function deloadSets(sets: number): number {
  return Math.ceil(sets / 2);
}

function attribute(
  slots: readonly SlotInput[],
  exercises: Readonly<Record<string, ExerciseInfo>>,
  secondaryWeight: number,
): { totals: Map<MuscleGroup, number>; days: Map<MuscleGroup, Set<string>> } {
  const totals = new Map<MuscleGroup, number>();
  const days = new Map<MuscleGroup, Set<string>>();
  for (const slot of slots) {
    if (!Number.isFinite(slot.sets) || slot.sets < 0) {
      throw new RangeError(`Slot for exercise ${slot.exerciseId} has invalid sets: ${slot.sets}`);
    }
    const exercise = exercises[slot.exerciseId];
    if (!exercise) throw new Error(`Unknown exercise: ${slot.exerciseId}`);

    // Each group is counted once per slot: fully for the primary muscle's group, at the secondary
    // weight for any other group the exercise reaches.
    const primary = MUSCLE_GROUP_OF[exercise.primary];
    totals.set(primary, (totals.get(primary) ?? 0) + slot.sets);
    if (slot.sets > 0) {
      const set = days.get(primary) ?? new Set<string>();
      set.add(slot.dayId ?? '\u0000no-day');
      days.set(primary, set);
    }
    const secondary = new Set(exercise.secondary.map((m) => MUSCLE_GROUP_OF[m]));
    secondary.delete(primary);
    for (const group of secondary) totals.set(group, (totals.get(group) ?? 0) + slot.sets * secondaryWeight);
  }
  return { totals, days };
}

export function computeGroupVolume(
  slots: readonly SlotInput[],
  exercises: Readonly<Record<string, ExerciseInfo>>,
  landmarks: Landmarks,
  opts: { secondaryWeight?: number } = {},
): GroupVolumeSummary {
  const secondaryWeight = opts.secondaryWeight ?? SECONDARY_MUSCLE_WEIGHT;
  const groups = groupLandmarks(landmarks);
  const { totals, days } = attribute(slots, exercises, secondaryWeight);
  const summary: GroupVolumeSummary['summary'] = {};
  for (const group of MUSCLE_GROUPS) {
    const exact = totals.get(group);
    if (exact === undefined) continue;
    const l = groups[group];
    const status = volumeStatus(exact, l);
    const entry: GroupVolume = {
      total_sets: roundToHalf(exact),
      exact_total_sets: exact,
      weekly_frequency: days.get(group)?.size ?? 0,
      status,
      landmarks: { mv: l.mv, mev: l.mev, mav_low: l.mavLow, mav_high: l.mavHigh, mrv: l.mrv },
      color: statusColor(status),
    };
    summary[group] = entry;
  }
  return { summary };
}

export type BlockVolume = Partial<Record<MuscleGroup, { weekly: number; block: number }>>;

// Sets per group over the whole mesocycle: every week repeats Week 1, except an optional final
// deload week at half the sets (rounded up per slot).
export function computeBlockVolume(
  slots: readonly SlotInput[],
  exercises: Readonly<Record<string, ExerciseInfo>>,
  opts: { weeks: number; deloadFinalWeek: boolean; secondaryWeight?: number },
): BlockVolume {
  if (!Number.isInteger(opts.weeks) || opts.weeks < 1) throw new RangeError(`weeks must be a positive integer, got ${opts.weeks}`);
  const weight = opts.secondaryWeight ?? SECONDARY_MUSCLE_WEIGHT;
  const weekly = attribute(slots, exercises, weight).totals;
  const deload = opts.deloadFinalWeek
    ? attribute(slots.map((slot) => ({ ...slot, sets: deloadSets(slot.sets) })), exercises, weight).totals
    : null;
  const fullWeeks = deload ? opts.weeks - 1 : opts.weeks;

  const result: BlockVolume = {};
  for (const group of MUSCLE_GROUPS) {
    const sets = weekly.get(group);
    if (sets === undefined) continue;
    result[group] = { weekly: sets, block: sets * fullWeeks + (deload?.get(group) ?? 0) };
  }
  return result;
}

export type LockWarning = { group: MuscleGroup; status: 'BELOW_MV' | 'EXCEEDS_MRV'; totalSets: number };

// Groups that lock-in asks the user to acknowledge (SPEC 6.2): trained below MV or above MRV.
// Untrained groups are not listed (they have no entry in the summary).
export function lockWarnings(volume: GroupVolumeSummary): LockWarning[] {
  return MUSCLE_GROUPS.flatMap((group): LockWarning[] => {
    const entry = volume.summary[group];
    if (!entry || (entry.status !== 'BELOW_MV' && entry.status !== 'EXCEEDS_MRV')) return [];
    return [{ group, status: entry.status, totalSets: entry.total_sets }];
  });
}
