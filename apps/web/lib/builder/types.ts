import type { Exercise, Muscle, Priority, ScheduleMode } from '@mesocycle/shared';

// Client-side draft state. Ids here are client ids: the server replaces all ids on every save.
export type BuilderSlot = {
  id: string;
  // The muscle this slot is attributed to (its exercise's primary muscle when it was added).
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
  // Derived from position in calendar mode (0 = Mon); null when days are numbered.
  weekday: number | null;
  // One ordered list for the whole day (SPEC 5.2). A day without slots is a rest day.
  slots: BuilderSlot[];
};

export type BuilderState = {
  // 'calendar' = Mon-Sun week (exactly 7 days); 'relative' = numbered days (1-10).
  mode: ScheduleMode;
  days: BuilderDay[];
  // Not editable in the UI for now; kept so saved priorities survive a round trip.
  priorities: Partial<Record<Muscle, Priority>>;
};

export type SlotMetrics = Pick<BuilderSlot, 'sets' | 'repMin' | 'repMax' | 'rir' | 'weight'>;
