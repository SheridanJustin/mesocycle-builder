import type { Exercise, Muscle, Priority } from '@mesocycle/shared';

// Client-side draft state. Ids here are client ids: the server replaces all ids on every save.
export type BuilderSlot = {
  id: string;
  // The section (muscle group) this slot sits in. May differ from exercise.primary_muscle.
  muscle: Muscle;
  exercise: Exercise;
  sets: number;
  repMin: number;
  repMax: number;
  rir: number;
  weight: number | null;
};

export type BuilderDay = {
  id: string;
  name: string;
  weekday: number | null;
  // Section order.
  muscles: Muscle[];
  // Global order across the whole day (SPEC 5.2); sections show their own slots in this order.
  slots: BuilderSlot[];
};

export type BuilderState = {
  days: BuilderDay[];
  priorities: Partial<Record<Muscle, Priority>>;
};

export type SlotMetrics = Pick<BuilderSlot, 'sets' | 'repMin' | 'repMax' | 'rir' | 'weight'>;
