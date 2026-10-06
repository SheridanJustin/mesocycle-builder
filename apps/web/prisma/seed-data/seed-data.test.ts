import { EQUIPMENT_TYPES, LandmarksSchema, MOVEMENT_TYPES, MUSCLES } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { EXERCISE_SEEDS } from './exercises';
import { LANDMARK_SEEDS } from './landmarks';

describe('landmark seeds', () => {
  it('has exactly one row per muscle', () => {
    expect(LANDMARK_SEEDS.map((l) => l.muscle).sort()).toEqual([...MUSCLES].sort());
  });

  it('satisfies mv <= mev <= mav_low <= mav_high <= mrv for every muscle', () => {
    for (const l of LANDMARK_SEEDS) {
      const result = LandmarksSchema.safeParse({ mv: l.mv, mev: l.mev, mav_low: l.mavLow, mav_high: l.mavHigh, mrv: l.mrv });
      expect(result.success, l.muscle).toBe(true);
    }
  });

  it('matches the spec values for a few spot checks', () => {
    const byMuscle = new Map(LANDMARK_SEEDS.map((l) => [l.muscle, l]));
    expect(byMuscle.get('chest')).toMatchObject({ mv: 8, mev: 10, mavLow: 12, mavHigh: 20, mrv: 22 });
    expect(byMuscle.get('forearms')).toMatchObject({ mv: 2, mev: 2, mavLow: 8, mavHigh: 12, mrv: 16 });
    expect(byMuscle.get('abs')).toMatchObject({ mv: 0, mev: 0, mavLow: 16, mavHigh: 20, mrv: 25 });
  });
});

describe('exercise seeds', () => {
  it('has at least 90 exercises', () => {
    expect(EXERCISE_SEEDS.length).toBeGreaterThanOrEqual(90);
  });

  it('has at least 6 exercises for every primary muscle', () => {
    for (const muscle of MUSCLES) {
      const count = EXERCISE_SEEDS.filter((e) => e.primaryMuscle === muscle).length;
      expect(count, muscle).toBeGreaterThanOrEqual(6);
    }
  });

  it('uses all five equipment types and both movement types', () => {
    expect(new Set(EXERCISE_SEEDS.map((e) => e.equipmentType))).toEqual(new Set(EQUIPMENT_TYPES));
    expect(new Set(EXERCISE_SEEDS.map((e) => e.movementType))).toEqual(new Set(MOVEMENT_TYPES));
  });

  it('has unique names (case-insensitive)', () => {
    const names = EXERCISE_SEEDS.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('never lists the primary muscle or a duplicate as a secondary muscle', () => {
    for (const e of EXERCISE_SEEDS) {
      expect(e.secondaryMuscles, e.name).not.toContain(e.primaryMuscle);
      expect(new Set(e.secondaryMuscles).size, e.name).toBe(e.secondaryMuscles.length);
    }
  });

  it('includes the exercises named in the spec', () => {
    const byName = new Map(EXERCISE_SEEDS.map((e) => [e.name, e]));
    expect(byName.get('Barbell Bench Press')).toMatchObject({
      primaryMuscle: 'chest',
      secondaryMuscles: ['front_delts', 'triceps'],
      equipmentType: 'barbell',
      movementType: 'compound',
    });
    expect(byName.get('Cable Fly')).toMatchObject({ primaryMuscle: 'chest', secondaryMuscles: [], equipmentType: 'cable', movementType: 'isolation' });
    expect(byName.get('Barbell Back Squat')).toMatchObject({ primaryMuscle: 'quads', secondaryMuscles: ['glutes'] });
    expect(byName.get('Lying Leg Curl')).toMatchObject({ primaryMuscle: 'hamstrings', equipmentType: 'machine', movementType: 'isolation' });
    expect(byName.get('Standing Calf Raise')).toMatchObject({ primaryMuscle: 'calves', equipmentType: 'machine', movementType: 'isolation' });
  });
});
