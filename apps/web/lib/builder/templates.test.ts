import { MESOCYCLE_TEMPLATES, MUSCLE_GROUPS, type Exercise, type MesocycleTemplate } from '@mesocycle/shared';
import { groupLandmarks } from '@mesocycle/volume-engine';
import { describe, expect, it } from 'vitest';
import { EXERCISE_SEEDS } from '../../prisma/seed-data/exercises';
import { LANDMARK_SEEDS } from '../../prisma/seed-data/landmarks';
import { matchingPreset } from './rep-ranges';
import { templateToState } from './templates';
import { computeBuilderVolume, toEngineLandmarks } from './volume';

const catalog: Exercise[] = EXERCISE_SEEDS.map((seed, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  name: seed.name,
  primary_muscle: seed.primaryMuscle,
  secondary_muscles: seed.secondaryMuscles,
  equipment_type: seed.equipmentType,
  movement_type: seed.movementType,
  is_custom: false,
}));
const landmarks = toEngineLandmarks({
  items: LANDMARK_SEEDS.map((l) => ({ muscle: l.muscle, mv: l.mv, mev: l.mev, mav_low: l.mavLow, mav_high: l.mavHigh, mrv: l.mrv })),
});
const groups = groupLandmarks(landmarks);

let counter = 0;
const makeId = () => `id-${++counter}`;

describe('templateToState', () => {
  it.each(MESOCYCLE_TEMPLATES.map((t) => [t.id, t] as const))('%s uses only seeded exercises', (_id, template) => {
    const { state, missing } = templateToState(template, catalog, makeId);
    expect(missing).toEqual([]);
    expect(state.days).toHaveLength(template.days.length);
    expect(state.days.map((d) => d.slots.length)).toEqual(template.days.map((d) => d.length));
    for (const slot of template.days.flat()) expect(matchingPreset(slot.repMin, slot.repMax), slot.exercise).not.toBeNull();
  });

  // Templates are starting points: every major group gets at least its MEV and none goes past the top of its MAV.
  it.each(MESOCYCLE_TEMPLATES.map((t) => [t.id, t] as const))('%s trains every group between MEV and MAV', (_id, template) => {
    const volume = computeBuilderVolume(templateToState(template, catalog, makeId).state, landmarks);
    for (const group of MUSCLE_GROUPS) {
      const sets = volume.summary[group]?.total_sets ?? 0;
      expect(sets, group).toBeGreaterThanOrEqual(groups[group].mev);
      expect(sets, group).toBeLessThanOrEqual(groups[group].mavHigh);
    }
  });

  it('names calendar days Mon-Sun with weekdays and copies the targets', () => {
    const template = MESOCYCLE_TEMPLATES.find((t) => t.id === 'upper-lower-4')!;
    const { state } = templateToState(template, catalog, makeId);
    expect(state.mode).toBe('calendar');
    expect(state.days.map((d) => d.name)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(state.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const first = state.days[0]!.slots[0]!;
    const spec = template.days[0]![0]!;
    expect(first.exercise.name).toBe(spec.exercise);
    expect([first.sets, first.repMin, first.repMax, first.rir, first.weight]).toEqual([spec.sets, spec.repMin, spec.repMax, spec.rir, null]);
    expect(first.muscle).toBe(first.exercise.primary_muscle);
  });

  it('skips and reports exercises missing from the catalog, and prefers built-in exercises', () => {
    const template: MesocycleTemplate = {
      id: 't',
      name: 'T',
      summary: '',
      mode: 'relative',
      days: [[{ exercise: 'Cable Fly', sets: 3, repMin: 10, repMax: 15, rir: 2 }, { exercise: 'Nope', sets: 3, repMin: 8, repMax: 12, rir: 2 }], []],
    };
    const custom = { ...catalog.find((e) => e.name === 'Cable Fly')!, id: '11111111-1111-4111-8111-111111111111', is_custom: true };
    const { state, missing } = templateToState(template, [custom, ...catalog], makeId);
    expect(missing).toEqual(['Nope']);
    expect(state.mode).toBe('relative');
    expect(state.days.map((d) => d.name)).toEqual(['Day 1', 'Day 2']);
    expect(state.days[0]!.slots.map((s) => s.exercise.is_custom)).toEqual([false]);
  });
});
