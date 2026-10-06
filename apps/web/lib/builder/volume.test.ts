import { MUSCLES, type Exercise, type MuscleLandmarkList } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { createSlot } from './reducer';
import type { BuilderState } from './types';
import { computeBuilderBlockVolume, computeBuilderVolume, contributionsFor, toEngineLandmarks } from './volume';

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
const pullup: Exercise = { ...bench, id: 'pullup', name: 'Pull-Up', primary_muscle: 'lats', secondary_muscles: ['biceps', 'upper_back'] };

function state(): BuilderState {
  return {
    mode: 'relative',
    days: [
      { id: 'd1', name: 'Push A', weekday: null, slots: [{ ...createSlot(bench, 's1'), sets: 4 }] },
      { id: 'd2', name: 'Pull', weekday: null, slots: [{ ...createSlot(pullup, 's2'), sets: 3 }] },
      { id: 'd3', name: 'Push B', weekday: null, slots: [{ ...createSlot(bench, 's3'), sets: 2 }] },
      { id: 'd4', name: 'Day 4', weekday: null, slots: [] },
    ],
    priorities: {},
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
  it('reports major muscle groups only', () => {
    const { summary } = computeBuilderVolume(state(), landmarks);
    expect(Object.keys(summary)).toEqual(['chest', 'back', 'shoulders', 'biceps', 'triceps']);
    expect(summary.chest).toMatchObject({ total_sets: 6, weekly_frequency: 2 });
    expect(summary.back).toMatchObject({ total_sets: 3, weekly_frequency: 1 });
    expect(summary.shoulders?.total_sets).toBe(3);
  });

  it('is empty for an empty board and reacts to edits', () => {
    expect(computeBuilderVolume({ mode: 'calendar', days: [], priorities: {} }, landmarks)).toEqual({ summary: {} });
    const edited = state();
    edited.days[0]!.slots[0] = { ...edited.days[0]!.slots[0]!, sets: 10 };
    expect(computeBuilderVolume(edited, landmarks).summary.chest?.total_sets).toBe(12);
  });
});

describe('computeBuilderBlockVolume', () => {
  it('totals each group over the block, with a half-volume deload week', () => {
    expect(computeBuilderBlockVolume(state(), 4, false).chest).toEqual({ weekly: 6, block: 24 });
    // Deload: ceil(4/2) + ceil(2/2) = 3 chest sets.
    expect(computeBuilderBlockVolume(state(), 4, true).chest).toEqual({ weekly: 6, block: 6 * 3 + 3 });
  });
});

describe('contributionsFor', () => {
  it('lists the exercises feeding a group with their day and role', () => {
    expect(contributionsFor(state(), 'shoulders')).toEqual([
      { dayName: 'Push A', exerciseName: 'Bench', sets: 4, role: 'secondary' },
      { dayName: 'Push B', exerciseName: 'Bench', sets: 2, role: 'secondary' },
    ]);
    expect(contributionsFor(state(), 'back')).toEqual([{ dayName: 'Pull', exerciseName: 'Pull-Up', sets: 3, role: 'primary' }]);
    expect(contributionsFor(state(), 'calves')).toEqual([]);
  });
});
