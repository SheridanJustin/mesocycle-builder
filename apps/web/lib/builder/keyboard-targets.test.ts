import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { dayDropId } from './drop';
import { keyboardTarget } from './keyboard-targets';
import { createSlot } from './reducer';
import type { BuilderState } from './types';

function exercise(id: string): Exercise {
  return { id, name: id, primary_muscle: 'chest', secondary_muscles: [], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
}

// Day 1: a, b, c. Day 2: e. Day 3: rest.
const state: BuilderState = {
  mode: 'relative',
  days: [
    { id: 'd1', name: 'Day 1', weekday: null, slots: ['a', 'b', 'c'].map((s) => createSlot(exercise(s), s)) },
    { id: 'd2', name: 'Day 2', weekday: null, slots: [createSlot(exercise('e'), 'e')] },
    { id: 'd3', name: 'Day 3', weekday: null, slots: [] },
  ],
  priorities: {},
};

describe('keyboardTarget', () => {
  it('walks the cards of the current day and stops at the ends', () => {
    expect(keyboardTarget(state, 'a', null, 'ArrowDown')).toBe('b');
    expect(keyboardTarget(state, 'a', 'c', 'ArrowUp')).toBe('b');
    expect(keyboardTarget(state, 'a', null, 'ArrowUp')).toBeNull();
    expect(keyboardTarget(state, 'a', 'c', 'ArrowDown')).toBeNull();
  });

  it('jumps between day columns and stops at the board edges', () => {
    expect(keyboardTarget(state, 'a', null, 'ArrowRight')).toBe(dayDropId('d2'));
    expect(keyboardTarget(state, 'a', dayDropId('d2'), 'ArrowRight')).toBe(dayDropId('d3'));
    expect(keyboardTarget(state, 'a', dayDropId('d3'), 'ArrowRight')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('d2'), 'ArrowLeft')).toBe(dayDropId('d1'));
    expect(keyboardTarget(state, 'a', null, 'ArrowLeft')).toBeNull();
  });

  it('steps from a column into its first card going down', () => {
    expect(keyboardTarget(state, 'a', dayDropId('d2'), 'ArrowDown')).toBe('e');
    expect(keyboardTarget(state, 'a', dayDropId('d3'), 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('d2'), 'ArrowUp')).toBeNull();
  });

  it('returns null for unknown ids', () => {
    expect(keyboardTarget(state, 'nope', null, 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', 'nope', 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('nope'), 'ArrowDown')).toBeNull();
  });
});
