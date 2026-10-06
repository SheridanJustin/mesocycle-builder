import type { Muscle } from '@mesocycle/shared';

export type LandmarkSeed = { muscle: Muscle; mv: number; mev: number; mavLow: number; mavHigh: number; mrv: number };

// Starting defaults in sets/week (SPEC 8.1). Editable here; not scientific absolutes.
export const LANDMARK_SEEDS: readonly LandmarkSeed[] = [
  { muscle: 'chest', mv: 8, mev: 10, mavLow: 12, mavHigh: 20, mrv: 22 },
  { muscle: 'lats', mv: 8, mev: 10, mavLow: 14, mavHigh: 22, mrv: 25 },
  { muscle: 'upper_back', mv: 6, mev: 8, mavLow: 12, mavHigh: 20, mrv: 25 },
  { muscle: 'traps', mv: 0, mev: 0, mavLow: 12, mavHigh: 20, mrv: 26 },
  { muscle: 'front_delts', mv: 0, mev: 0, mavLow: 6, mavHigh: 8, mrv: 12 },
  { muscle: 'side_delts', mv: 0, mev: 8, mavLow: 16, mavHigh: 22, mrv: 26 },
  { muscle: 'rear_delts', mv: 0, mev: 6, mavLow: 16, mavHigh: 22, mrv: 26 },
  { muscle: 'biceps', mv: 4, mev: 8, mavLow: 14, mavHigh: 20, mrv: 26 },
  { muscle: 'triceps', mv: 4, mev: 6, mavLow: 10, mavHigh: 14, mrv: 18 },
  { muscle: 'forearms', mv: 2, mev: 2, mavLow: 8, mavHigh: 12, mrv: 16 },
  { muscle: 'quads', mv: 6, mev: 8, mavLow: 12, mavHigh: 18, mrv: 20 },
  { muscle: 'hamstrings', mv: 4, mev: 6, mavLow: 10, mavHigh: 16, mrv: 20 },
  { muscle: 'glutes', mv: 0, mev: 0, mavLow: 4, mavHigh: 12, mrv: 16 },
  { muscle: 'calves', mv: 6, mev: 8, mavLow: 12, mavHigh: 16, mrv: 20 },
  { muscle: 'abs', mv: 0, mev: 0, mavLow: 16, mavHigh: 20, mrv: 25 },
];
