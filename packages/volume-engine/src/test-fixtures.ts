import type { Muscle } from '@mesocycle/shared';
import type { ExerciseInfo, Landmarks } from './types';

// SPEC 8.1 default landmarks, used only as test input.
const ROWS: Record<Muscle, [number, number, number, number, number]> = {
  chest: [8, 10, 12, 20, 22],
  lats: [8, 10, 14, 22, 25],
  upper_back: [6, 8, 12, 20, 25],
  traps: [0, 0, 12, 20, 26],
  front_delts: [0, 0, 6, 8, 12],
  side_delts: [0, 8, 16, 22, 26],
  rear_delts: [0, 6, 16, 22, 26],
  biceps: [4, 8, 14, 20, 26],
  triceps: [4, 6, 10, 14, 18],
  forearms: [2, 2, 8, 12, 16],
  quads: [6, 8, 12, 18, 20],
  hamstrings: [4, 6, 10, 16, 20],
  glutes: [0, 0, 4, 12, 16],
  calves: [6, 8, 12, 16, 20],
  abs: [0, 0, 16, 20, 25],
};

export const LANDMARKS = Object.fromEntries(
  Object.entries(ROWS).map(([muscle, [mv, mev, mavLow, mavHigh, mrv]]) => [muscle, { mv, mev, mavLow, mavHigh, mrv }]),
) as Landmarks;

export const EXERCISES: Record<string, ExerciseInfo> = {
  bench: { id: 'bench', primary: 'chest', secondary: ['front_delts', 'triceps'] },
  fly: { id: 'fly', primary: 'chest', secondary: [] },
  squat: { id: 'squat', primary: 'quads', secondary: ['glutes'] },
  legCurl: { id: 'legCurl', primary: 'hamstrings', secondary: [] },
  pushdown: { id: 'pushdown', primary: 'triceps', secondary: [] },
  // Malformed on purpose: duplicate secondary entries and the primary listed as secondary.
  odd: { id: 'odd', primary: 'chest', secondary: ['triceps', 'triceps', 'chest'] },
};
