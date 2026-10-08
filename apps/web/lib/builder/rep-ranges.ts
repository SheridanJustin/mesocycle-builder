import { MAX_REPS, MIN_REPS } from '@mesocycle/shared';

// SPEC 10.3 presets, plus 8-12 because it is the default for a new slot.
export const REP_PRESETS = [
  { min: 8, max: 12 },
  { min: 5, max: 10 },
  { min: 10, max: 15 },
  { min: 15, max: 20 },
  { min: 20, max: 30 },
] as const;

export const presetLabel = (preset: { min: number; max: number }): string => `${preset.min}–${preset.max}`;

export function matchingPreset(min: number, max: number): (typeof REP_PRESETS)[number] | null {
  return REP_PRESETS.find((p) => p.min === min && p.max === max) ?? null;
}

// Returns an error message for an invalid rep range (min >= 1, min < max <= 50), else null.
export function repRangeError(min: number, max: number): string | null {
  if (!Number.isInteger(min) || !Number.isInteger(max)) return 'Reps must be whole numbers';
  if (min < MIN_REPS) return `Minimum is ${MIN_REPS}`;
  if (max > MAX_REPS) return `Maximum is ${MAX_REPS}`;
  if (min >= max) return 'Min must be below max';
  return null;
}
