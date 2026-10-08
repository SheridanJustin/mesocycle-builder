import type { ScheduleMode } from './enums';

// Prebuilt starting points (SPEC 10.10). Exercises are referenced by their seeded catalog name; the
// web app resolves them against GET /exercises when a template is applied. Rep ranges are the
// board's presets (5-10, 8-12, 10-15, 15-20), so cards show them without a custom range.
export type TemplateExercise = { exercise: string; sets: number; repMin: number; repMax: number; rir: number };

export type MesocycleTemplate = {
  id: string;
  name: string;
  summary: string;
  mode: ScheduleMode;
  // One entry per cycle day, in order. An empty day is a rest day. Calendar templates have 7 days (Mon-Sun).
  days: readonly (readonly TemplateExercise[])[];
};

function ex(exercise: string, sets: number, [repMin, repMax]: readonly [number, number], rir = 2): TemplateExercise {
  return { exercise, sets, repMin, repMax, rir };
}

const HEAVY = [5, 10] as const;
const MODERATE = [8, 12] as const;
const LIGHT = [15, 20] as const;
const ARMS = [10, 15] as const;

const REST: readonly TemplateExercise[] = [];

const UPPER_A = [
  ex('Barbell Bench Press', 4, HEAVY),
  ex('Seated Cable Row', 3, MODERATE),
  ex('Seated Dumbbell Shoulder Press', 2, MODERATE),
  ex('Lat Pulldown', 3, MODERATE),
  ex('Dumbbell Lateral Raise', 3, LIGHT),
  ex('Cable Curl', 3, ARMS),
  ex('Cable Pushdown', 3, ARMS),
];
const UPPER_B = [
  ex('Incline Dumbbell Press', 3, MODERATE),
  ex('Chest-Supported Machine Row', 3, MODERATE),
  ex('Pull-Up', 3, HEAVY),
  ex('Cable Fly', 3, ARMS),
  ex('Cable Lateral Raise', 3, LIGHT),
  ex('Face Pull', 2, LIGHT),
  ex('Incline Dumbbell Curl', 3, ARMS),
  ex('Overhead Cable Triceps Extension', 2, ARMS),
];
const LOWER_A = [
  ex('Barbell Back Squat', 3, HEAVY),
  ex('Romanian Deadlift', 3, MODERATE),
  ex('Leg Extension', 2, ARMS),
  ex('Lying Leg Curl', 2, ARMS),
  ex('Standing Calf Raise', 4, ARMS),
  ex('Cable Crunch', 3, ARMS),
];
const LOWER_B = [
  ex('Leg Press', 3, MODERATE),
  ex('Barbell Hip Thrust', 3, MODERATE),
  ex('Seated Leg Curl', 3, ARMS),
  ex('Bulgarian Split Squat', 2, MODERATE),
  ex('Seated Calf Raise', 4, ARMS),
  ex('Hanging Leg Raise', 3, ARMS),
];

const PUSH_A = [
  ex('Barbell Bench Press', 3, HEAVY),
  ex('Seated Dumbbell Shoulder Press', 2, MODERATE),
  ex('Incline Dumbbell Press', 2, MODERATE),
  ex('Dumbbell Lateral Raise', 3, LIGHT),
  ex('Cable Pushdown', 3, ARMS),
];
const PUSH_B = [
  ex('Machine Chest Press', 3, MODERATE),
  ex('Cable Fly', 2, ARMS),
  ex('Cable Lateral Raise', 3, LIGHT),
  ex('Overhead Cable Triceps Extension', 2, ARMS),
];
const PULL_A = [
  ex('Pull-Up', 3, HEAVY),
  ex('Seated Cable Row', 3, MODERATE),
  ex('Face Pull', 2, LIGHT),
  ex('Barbell Curl', 2, ARMS),
  ex('Hammer Curl', 2, ARMS),
];
const PULL_B = [
  ex('Lat Pulldown', 3, MODERATE),
  ex('Chest-Supported Machine Row', 3, MODERATE),
  ex('Reverse Pec Deck', 2, LIGHT),
  ex('Incline Dumbbell Curl', 3, ARMS),
];
const LEGS_A = [
  ex('Barbell Back Squat', 3, HEAVY),
  ex('Romanian Deadlift', 3, MODERATE),
  ex('Leg Extension', 2, ARMS),
  ex('Standing Calf Raise', 4, ARMS),
  ex('Cable Crunch', 3, ARMS),
];
const LEGS_B = [
  ex('Hack Squat', 3, MODERATE),
  ex('Barbell Hip Thrust', 2, MODERATE),
  ex('Lying Leg Curl', 3, ARMS),
  ex('Seated Calf Raise', 4, ARMS),
  ex('Hanging Leg Raise', 2, ARMS),
];

export const MESOCYCLE_TEMPLATES: readonly MesocycleTemplate[] = [
  {
    id: 'full-body-3',
    name: 'Full Body',
    summary: '3 days a week (Mon, Wed, Fri). Every muscle group, every session. Great for beginners or a busy schedule.',
    mode: 'calendar',
    days: [
      [
        ex('Barbell Back Squat', 3, HEAVY),
        ex('Barbell Bench Press', 4, HEAVY),
        ex('Seated Cable Row', 3, MODERATE),
        ex('Romanian Deadlift', 2, MODERATE),
        ex('Dumbbell Lateral Raise', 3, LIGHT),
        ex('Cable Curl', 3, ARMS),
        ex('Standing Calf Raise', 4, ARMS),
      ],
      REST,
      [
        ex('Leg Press', 3, MODERATE),
        ex('Incline Dumbbell Press', 3, MODERATE),
        ex('Lat Pulldown', 3, MODERATE),
        ex('Lying Leg Curl', 3, ARMS),
        ex('Cable Lateral Raise', 3, LIGHT),
        ex('Cable Pushdown', 3, ARMS),
        ex('Cable Crunch', 3, ARMS),
      ],
      REST,
      [
        ex('Hack Squat', 3, MODERATE),
        ex('Machine Chest Press', 3, MODERATE),
        ex('Chest-Supported Machine Row', 3, MODERATE),
        ex('Barbell Hip Thrust', 2, MODERATE),
        ex('Face Pull', 3, LIGHT),
        ex('Incline Dumbbell Curl', 3, ARMS),
        ex('Seated Calf Raise', 4, ARMS),
        ex('Hanging Leg Raise', 3, ARMS),
      ],
      REST,
      REST,
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower',
    summary: '4 days a week (Mon, Tue, Thu, Fri). Upper body and lower body alternate, each trained twice a week.',
    mode: 'calendar',
    days: [UPPER_A, LOWER_A, REST, UPPER_B, LOWER_B, REST, REST],
  },
  {
    id: 'ppl-ul-5',
    name: 'Push / Pull / Legs + Upper / Lower',
    summary: '5 days a week (Mon–Wed, Fri, Sat). A push, pull and legs day, then an upper and a lower day.',
    mode: 'calendar',
    days: [
      [...PUSH_A, ex('Cable Fly', 2, ARMS)],
      [...PULL_A, ex('Chest-Supported Machine Row', 2, MODERATE)],
      LEGS_A,
      REST,
      UPPER_B,
      LOWER_B,
      REST,
    ],
  },
  {
    id: 'ppl-6',
    name: 'Push / Pull / Legs',
    summary: '6 days a week (Mon–Sat). Push, pull and legs, twice through. Higher frequency for experienced lifters.',
    mode: 'calendar',
    days: [PUSH_A, PULL_A, LEGS_A, PUSH_B, PULL_B, LEGS_B, REST],
  },
];

export function findTemplate(id: string): MesocycleTemplate | undefined {
  return MESOCYCLE_TEMPLATES.find((template) => template.id === id);
}
