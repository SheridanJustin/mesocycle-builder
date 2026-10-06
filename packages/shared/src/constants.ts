// Enum value lists. Order matters: the volume engine emits muscles in MUSCLES order.
export const MUSCLES = [
  'chest',
  'lats',
  'upper_back',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
] as const;
export const EQUIPMENT_TYPES = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'] as const;
export const MOVEMENT_TYPES = ['compound', 'isolation'] as const;
export const PRIORITIES = ['focus', 'normal', 'maintenance'] as const;
export const MESOCYCLE_STATUSES = ['draft', 'active', 'completed'] as const;
export const SCHEDULE_MODES = ['calendar', 'relative'] as const;
export const WEIGHT_UNITS = ['kg', 'lb'] as const;

export const VOLUME_STATUSES = ['BELOW_MV', 'MAINTENANCE', 'ABOVE_MEV', 'MAV', 'HIGH', 'EXCEEDS_MRV'] as const;
export const VOLUME_COLORS = ['amber', 'lightgreen', 'green', 'orange', 'red'] as const;

// Volume status colors are fixed (SPEC 7.4). Do not add others.
export const VOLUME_STATUS_COLOR = {
  BELOW_MV: 'amber',
  MAINTENANCE: 'amber',
  ABOVE_MEV: 'lightgreen',
  MAV: 'green',
  HIGH: 'orange',
  EXCEEDS_MRV: 'red',
} as const satisfies Record<(typeof VOLUME_STATUSES)[number], (typeof VOLUME_COLORS)[number]>;

// A secondary-muscle set counts this much toward the secondary muscle (SPEC 2.3).
export const SECONDARY_MUSCLE_WEIGHT = 0.5;

// Validation bounds (SPEC 5.2 and 10.9).
export const MIN_DURATION_WEEKS = 4;
export const MAX_DURATION_WEEKS = 6;
// A mesocycle's repeating cycle is 1-10 days long (7 by default: a Mon-Sun week).
// Days without exercises are rest days.
export const MIN_CYCLE_DAYS = 1;
export const MAX_CYCLE_DAYS = 10;
export const DEFAULT_CYCLE_DAYS = 7;
// Weekday names (Mon-Sun) need exactly this many days; otherwise days are numbered.
export const WEEK_DAYS = 7;
export const DEFAULT_MESOCYCLE_NAME = 'Untitled block';
export const MAX_DAY_NAME_LENGTH = 50;
export const MIN_SETS = 1;
export const MAX_SETS = 10;
export const MIN_RIR = 0;
export const MAX_RIR = 5;
export const MIN_REPS = 1;
export const MAX_REPS = 50;

// Defaults for a newly added exercise slot (SPEC 10.3).
export const DEFAULT_SLOT_SETS = 3;
export const DEFAULT_REP_RANGE_MIN = 8;
export const DEFAULT_REP_RANGE_MAX = 12;
export const DEFAULT_RIR = 3;

// Estimated session duration (SPEC 10.7).
export const WARMUP_MINUTES = 5;
export const WORK_SECONDS_PER_SET = 45;
export const REST_SECONDS = { compound: 150, isolation: 90 } as const;

// Exercise catalog paging (SPEC 6.2).
export const DEFAULT_EXERCISE_PAGE_SIZE = 50;
export const MAX_EXERCISE_PAGE_SIZE = 200;

// Major muscle groups shown in the volume bar and on Review. Back and shoulders merge several
// muscles that are trained by the same exercises; forearms count toward biceps.
export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'] as const;

export const MUSCLE_GROUP_OF = {
  chest: 'chest',
  lats: 'back',
  upper_back: 'back',
  traps: 'back',
  front_delts: 'shoulders',
  side_delts: 'shoulders',
  rear_delts: 'shoulders',
  biceps: 'biceps',
  forearms: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abs: 'abs',
} as const satisfies Record<(typeof MUSCLES)[number], (typeof MUSCLE_GROUPS)[number]>;
