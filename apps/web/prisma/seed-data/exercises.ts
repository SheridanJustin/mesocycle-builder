import type { Equipment, MovementType, Muscle } from '@mesocycle/shared';

export type ExerciseSeed = {
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipmentType: Equipment;
  movementType: MovementType;
};

type Row = [name: string, secondary: Muscle[], equipment: Equipment, movement: MovementType];

function group(primary: Muscle, rows: Row[]): ExerciseSeed[] {
  return rows.map(([name, secondaryMuscles, equipmentType, movementType]) => ({
    name,
    primaryMuscle: primary,
    secondaryMuscles,
    equipmentType,
    movementType,
  }));
}

// Global catalog (SPEC 8.2): at least 6 per primary muscle, all five equipment types used.
export const EXERCISE_SEEDS: readonly ExerciseSeed[] = [
  ...group('chest', [
    ['Barbell Bench Press', ['front_delts', 'triceps'], 'barbell', 'compound'],
    ['Incline Dumbbell Press', ['front_delts', 'triceps'], 'dumbbell', 'compound'],
    ['Machine Chest Press', ['front_delts', 'triceps'], 'machine', 'compound'],
    ['Push-Up', ['front_delts', 'triceps'], 'bodyweight', 'compound'],
    ['Chest Dip', ['front_delts', 'triceps'], 'bodyweight', 'compound'],
    ['Cable Fly', [], 'cable', 'isolation'],
    ['Dumbbell Fly', [], 'dumbbell', 'isolation'],
    ['Pec Deck', [], 'machine', 'isolation'],
  ]),
  ...group('lats', [
    ['Pull-Up', ['biceps', 'upper_back'], 'bodyweight', 'compound'],
    ['Chin-Up', ['biceps', 'upper_back'], 'bodyweight', 'compound'],
    ['Lat Pulldown', ['biceps', 'upper_back'], 'cable', 'compound'],
    ['Close-Grip Pulldown', ['biceps', 'upper_back'], 'cable', 'compound'],
    ['Machine Pulldown', ['biceps', 'upper_back'], 'machine', 'compound'],
    ['Single-Arm Dumbbell Row', ['upper_back', 'biceps'], 'dumbbell', 'compound'],
    ['Straight-Arm Pulldown', [], 'cable', 'isolation'],
  ]),
  ...group('upper_back', [
    ['Barbell Row', ['lats', 'biceps', 'rear_delts'], 'barbell', 'compound'],
    ['T-Bar Row', ['lats', 'biceps'], 'barbell', 'compound'],
    ['Seated Cable Row', ['lats', 'biceps'], 'cable', 'compound'],
    ['Chest-Supported Machine Row', ['lats', 'biceps'], 'machine', 'compound'],
    ['Chest-Supported Dumbbell Row', ['lats', 'rear_delts'], 'dumbbell', 'compound'],
    ['Inverted Row', ['lats', 'biceps'], 'bodyweight', 'compound'],
  ]),
  ...group('traps', [
    ['Barbell Shrug', ['forearms'], 'barbell', 'isolation'],
    ['Dumbbell Shrug', ['forearms'], 'dumbbell', 'isolation'],
    ['Cable Shrug', [], 'cable', 'isolation'],
    ['Machine Shrug', [], 'machine', 'isolation'],
    ['Rack Pull', ['upper_back', 'forearms'], 'barbell', 'compound'],
    ['Farmer\'s Carry', ['forearms'], 'dumbbell', 'compound'],
  ]),
  ...group('front_delts', [
    ['Barbell Overhead Press', ['triceps', 'side_delts'], 'barbell', 'compound'],
    ['Seated Dumbbell Shoulder Press', ['triceps', 'side_delts'], 'dumbbell', 'compound'],
    ['Machine Shoulder Press', ['triceps', 'side_delts'], 'machine', 'compound'],
    ['Pike Push-Up', ['triceps', 'side_delts'], 'bodyweight', 'compound'],
    ['Dumbbell Front Raise', [], 'dumbbell', 'isolation'],
    ['Cable Front Raise', [], 'cable', 'isolation'],
    ['Barbell Front Raise', [], 'barbell', 'isolation'],
  ]),
  ...group('side_delts', [
    ['Dumbbell Lateral Raise', [], 'dumbbell', 'isolation'],
    ['Seated Dumbbell Lateral Raise', [], 'dumbbell', 'isolation'],
    ['Cable Lateral Raise', [], 'cable', 'isolation'],
    ['Single-Arm Cable Lateral Raise', [], 'cable', 'isolation'],
    ['Machine Lateral Raise', [], 'machine', 'isolation'],
    ['Barbell Upright Row', ['traps', 'front_delts'], 'barbell', 'compound'],
  ]),
  ...group('rear_delts', [
    ['Reverse Pec Deck', ['upper_back'], 'machine', 'isolation'],
    ['Face Pull', ['upper_back'], 'cable', 'isolation'],
    ['Cable Reverse Fly', ['upper_back'], 'cable', 'isolation'],
    ['Bent-Over Dumbbell Reverse Fly', ['upper_back'], 'dumbbell', 'isolation'],
    ['Barbell Rear Delt Row', ['upper_back', 'biceps'], 'barbell', 'compound'],
    ['Prone Y Raise', [], 'bodyweight', 'isolation'],
  ]),
  ...group('biceps', [
    ['Barbell Curl', ['forearms'], 'barbell', 'isolation'],
    ['EZ-Bar Preacher Curl', ['forearms'], 'barbell', 'isolation'],
    ['Dumbbell Curl', ['forearms'], 'dumbbell', 'isolation'],
    ['Incline Dumbbell Curl', [], 'dumbbell', 'isolation'],
    ['Hammer Curl', ['forearms'], 'dumbbell', 'isolation'],
    ['Cable Curl', [], 'cable', 'isolation'],
    ['Machine Preacher Curl', [], 'machine', 'isolation'],
  ]),
  ...group('triceps', [
    ['Close-Grip Bench Press', ['chest', 'front_delts'], 'barbell', 'compound'],
    ['Skull Crusher', [], 'barbell', 'isolation'],
    ['Cable Pushdown', [], 'cable', 'isolation'],
    ['Overhead Cable Triceps Extension', [], 'cable', 'isolation'],
    ['Dumbbell Overhead Triceps Extension', [], 'dumbbell', 'isolation'],
    ['Machine Dip', ['chest', 'front_delts'], 'machine', 'compound'],
    ['Bench Dip', ['chest', 'front_delts'], 'bodyweight', 'compound'],
  ]),
  ...group('forearms', [
    ['Barbell Wrist Curl', [], 'barbell', 'isolation'],
    ['Barbell Reverse Wrist Curl', [], 'barbell', 'isolation'],
    ['Dumbbell Wrist Curl', [], 'dumbbell', 'isolation'],
    ['Barbell Reverse Curl', ['biceps'], 'barbell', 'isolation'],
    ['Cable Wrist Curl', [], 'cable', 'isolation'],
    ['Dead Hang', [], 'bodyweight', 'isolation'],
  ]),
  ...group('quads', [
    ['Barbell Back Squat', ['glutes'], 'barbell', 'compound'],
    ['Barbell Front Squat', ['glutes'], 'barbell', 'compound'],
    ['Leg Press', ['glutes'], 'machine', 'compound'],
    ['Hack Squat', ['glutes'], 'machine', 'compound'],
    ['Bulgarian Split Squat', ['glutes'], 'dumbbell', 'compound'],
    ['Goblet Squat', ['glutes'], 'dumbbell', 'compound'],
    ['Leg Extension', [], 'machine', 'isolation'],
    ['Sissy Squat', [], 'bodyweight', 'isolation'],
  ]),
  ...group('hamstrings', [
    ['Romanian Deadlift', ['glutes'], 'barbell', 'compound'],
    ['Stiff-Leg Deadlift', ['glutes'], 'barbell', 'compound'],
    ['Good Morning', ['glutes'], 'barbell', 'compound'],
    ['Dumbbell Romanian Deadlift', ['glutes'], 'dumbbell', 'compound'],
    ['Lying Leg Curl', [], 'machine', 'isolation'],
    ['Seated Leg Curl', [], 'machine', 'isolation'],
    ['Nordic Curl', [], 'bodyweight', 'isolation'],
  ]),
  ...group('glutes', [
    ['Barbell Hip Thrust', ['hamstrings'], 'barbell', 'compound'],
    ['Sumo Deadlift', ['hamstrings', 'quads'], 'barbell', 'compound'],
    ['Dumbbell Step-Up', ['quads'], 'dumbbell', 'compound'],
    ['Glute Bridge', ['hamstrings'], 'bodyweight', 'compound'],
    ['Cable Pull-Through', ['hamstrings'], 'cable', 'compound'],
    ['Cable Glute Kickback', [], 'cable', 'isolation'],
    ['Machine Hip Abduction', [], 'machine', 'isolation'],
  ]),
  ...group('calves', [
    ['Standing Calf Raise', [], 'machine', 'isolation'],
    ['Seated Calf Raise', [], 'machine', 'isolation'],
    ['Leg Press Calf Raise', [], 'machine', 'isolation'],
    ['Barbell Standing Calf Raise', [], 'barbell', 'isolation'],
    ['Single-Leg Dumbbell Calf Raise', [], 'dumbbell', 'isolation'],
    ['Bodyweight Calf Raise', [], 'bodyweight', 'isolation'],
  ]),
  ...group('abs', [
    ['Cable Crunch', [], 'cable', 'isolation'],
    ['Machine Crunch', [], 'machine', 'isolation'],
    ['Hanging Leg Raise', [], 'bodyweight', 'isolation'],
    ['Ab Wheel Rollout', [], 'bodyweight', 'isolation'],
    ['Decline Sit-Up', [], 'bodyweight', 'isolation'],
    ['Weighted Dumbbell Crunch', [], 'dumbbell', 'isolation'],
    ['Barbell Rollout', [], 'barbell', 'isolation'],
  ]),
];
