import { REST_SECONDS, WARMUP_MINUTES, WORK_SECONDS_PER_SET } from './constants';
import type { MovementType } from './enums';

export type DurationSlot = { sets: number; movementType: MovementType };

// SPEC 10.7: 5 min warm-up + sum of sets x (45 s work + rest), rounded to the nearest 5 minutes.
export function estimateSessionMinutes(slots: readonly DurationSlot[]): number {
  const seconds = slots.reduce(
    (total, slot) => total + slot.sets * (WORK_SECONDS_PER_SET + REST_SECONDS[slot.movementType]),
    0,
  );
  const minutes = WARMUP_MINUTES + seconds / 60;
  return Math.round(minutes / 5) * 5;
}
