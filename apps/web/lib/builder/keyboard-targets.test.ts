import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { dayDropId } from './drop';
import { keyboardTarget } from './keyboard-targets';
import { createDay, createSlot } from './reducer';
import type { BuilderState } from './types';

function exercise(id: string, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return { id, name: id, primary_muscle: primary, secondary_muscles: [], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
}

// Day 1: chest [a, c], triceps [b]. Day 2: chest [e]. Day 3: empty.
const state: BuilderState = {
  days: [
    { ...createDay('d1', 'Day 1'), muscles: ['chest', 'triceps'], slots: [createSlot(exercise('a'), 'chest', 'a'), createSlot(exercise('b', 'triceps'), 'triceps', 'b'), createSlot(exercise('c'), 'chest', 'c')] },
    { ...createDay('d2', 'Day 2'), muscles: ['chest'], slots: [createSlot(exercise('e'), 'chest', 'e')] },
    createDay('d3', 'Day 3'),
  ],
  priorities: {},
};

describe('keyboardTarget up/down', () => {
  it('steps through the cards of the current section, skipping other sections', () => {
    expect(keyboardTarget(state, 'a', null, 'ArrowDown')).toBe('c');
    expect(keyboardTarget(state, 'a', 'c', 'ArrowUp')).toBe('a');
  });

  it('stops at the edges of a section', () => {
    expect(keyboardTarget(state, 'a', null, 'ArrowUp')).toBeNull();
    expect(keyboardTarget(state, 'a', 'c', 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'b', null, 'ArrowDown')).toBeNull();
  });

  it('walks the section of whatever the drag is currently over', () => {
    // After moving right onto Day 2's chest card, down has nowhere to go but up does not either.
    expect(keyboardTarget(state, 'a', 'e', 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', 'e', 'ArrowUp')).toBeNull();
  });

  it('enters the first card from a day column when going down', () => {
    expect(keyboardTarget(state, 'a', dayDropId('d1'), 'ArrowDown')).toBe('a');
    expect(keyboardTarget(state, 'a', dayDropId('d3'), 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('d1'), 'ArrowUp')).toBeNull();
  });
});

describe('keyboardTarget left/right', () => {
  it('moves onto the card in the next day\'s section for the primary muscle', () => {
    expect(keyboardTarget(state, 'a', null, 'ArrowRight')).toBe('e');
  });

  it('falls back to the day column when that section does not exist', () => {
    expect(keyboardTarget(state, 'b', null, 'ArrowRight')).toBe(dayDropId('d2'));
    expect(keyboardTarget(state, 'a', 'e', 'ArrowRight')).toBe(dayDropId('d3'));
  });

  it('goes back left and stops at the board edges', () => {
    expect(keyboardTarget(state, 'a', 'e', 'ArrowLeft')).toBe('a');
    expect(keyboardTarget(state, 'a', null, 'ArrowLeft')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('d3'), 'ArrowRight')).toBeNull();
  });
});

describe('keyboardTarget with unknown ids', () => {
  it('returns null', () => {
    expect(keyboardTarget(state, 'nope', null, 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', 'nope', 'ArrowDown')).toBeNull();
    expect(keyboardTarget(state, 'a', dayDropId('nope'), 'ArrowDown')).toBeNull();
  });
});
