import { MUSCLES, type Exercise, type MuscleLandmarkList } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { createDay, createSlot } from './reducer';
import type { BuilderState } from './types';
import { computeBuilderVolume, contributionsFor, toEngineLandmarks } from './volume';

const list: MuscleLandmarkList = {
  items: MUSCLES.map((muscle) => ({ muscle, mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 })),
};
const landmarks = toEngineLandmarks(list);

const bench: Exercise = {
  id: 'bench',
  name: 'Bench',
  primary_muscle: 'chest',
  secondary_muscles: ['front_delts', 'triceps'],
  equipment_type: 'barbell',
  movement_type: 'compound',
  is_custom: false,
};

function state(): BuilderState {
  return {
    days: [
      { ...createDay('d1', 'Push A'), muscles: ['chest', 'quads'], slots: [{ ...createSlot(bench, 'chest', 's1'), sets: 4 }] },
      { ...createDay('d2', 'Push B'), muscles: ['chest'], slots: [{ ...createSlot(bench, 'chest', 's2'), sets: 2 }] },
    ],
    priorities: { chest: 'focus' },
  };
}

describe('toEngineLandmarks', () => {
  it('maps snake_case rows to the engine shape', () => {
    expect(landmarks.chest).toEqual({ mv: 8, mev: 10, mavLow: 12, mavHigh: 20, mrv: 22 });
  });

  it('throws when a muscle is missing', () => {
    expect(() => toEngineLandmarks({ items: list.items.slice(1) })).toThrow('Landmarks missing for chest');
  });
});

describe('computeBuilderVolume', () => {
  it('feeds slots, days, priorities and assigned muscles into the engine', () => {
    const { summary } = computeBuilderVolume(state(), landmarks);
    expect(summary.chest).toMatchObject({ total_sets: 6, weekly_frequency: 2, priority: 'focus' });
    expect(summary.triceps?.total_sets).toBe(3);
    expect(summary.quads).toMatchObject({ total_sets: 0, status: 'BELOW_MV' });
  });

  it('is empty for an empty board', () => {
    expect(computeBuilderVolume({ days: [], priorities: {} }, landmarks)).toEqual({ summary: {} });
  });

  it('reacts to edits', () => {
    const edited = state();
    edited.days[0]!.slots[0] = { ...edited.days[0]!.slots[0]!, sets: 10 };
    expect(computeBuilderVolume(edited, landmarks).summary.chest?.total_sets).toBe(12);
  });
});

describe('contributionsFor', () => {
  it('lists primary and secondary contributors with their day', () => {
    expect(contributionsFor(state(), 'triceps')).toEqual([
      { dayName: 'Push A', exerciseName: 'Bench', sets: 4, role: 'secondary' },
      { dayName: 'Push B', exerciseName: 'Bench', sets: 2, role: 'secondary' },
    ]);
    expect(contributionsFor(state(), 'chest').map((c) => c.role)).toEqual(['primary', 'primary']);
    expect(contributionsFor(state(), 'abs')).toEqual([]);
  });
});
