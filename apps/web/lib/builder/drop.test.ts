import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { columnId, dayDropId, describeDayMove, describeMove, resolveDayDrop, resolveDrop } from './drop';
import { builderReducer, createSlot } from './reducer';
import type { BuilderState } from './types';

function exercise(id: string): Exercise {
  return { id, name: `Ex ${id}`, primary_muscle: 'chest', secondary_muscles: [], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
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

const order = (s: BuilderState, dayId: string) => s.days.find((d) => d.id === dayId)?.slots.map((x) => x.id);
const apply = (activeId: string, overId: string) => {
  const action = resolveDrop(state, activeId, overId);
  return action ? builderReducer(state, action) : state;
};

describe('resolveDrop within a day', () => {
  it('dropping on a card above puts the dragged card before it', () => {
    expect(order(apply('c', 'a'), 'd1')).toEqual(['c', 'a', 'b']);
    expect(order(apply('c', 'b'), 'd1')).toEqual(['a', 'c', 'b']);
  });

  it('dropping on a card below puts the dragged card after it', () => {
    expect(order(apply('a', 'b'), 'd1')).toEqual(['b', 'a', 'c']);
    expect(order(apply('a', 'c'), 'd1')).toEqual(['b', 'c', 'a']);
  });

  it('does nothing when dropped on itself, its own column, or an unknown target', () => {
    expect(resolveDrop(state, 'a', 'a')).toBeNull();
    expect(resolveDrop(state, 'a', dayDropId('d1'))).toBeNull();
    expect(resolveDrop(state, 'a', 'nope')).toBeNull();
    expect(resolveDrop(state, 'nope', 'a')).toBeNull();
    expect(resolveDrop(state, 'a', dayDropId('nope'))).toBeNull();
  });
});

describe('resolveDrop across days', () => {
  it('lands before the card it was dropped on', () => {
    const next = apply('a', 'e');
    expect(order(next, 'd2')).toEqual(['a', 'e']);
    expect(order(next, 'd1')).toEqual(['b', 'c']);
  });

  it('appends when dropped on a column, including a rest day', () => {
    expect(order(apply('b', dayDropId('d3')), 'd3')).toEqual(['b']);
    expect(order(apply('b', dayDropId('d2')), 'd2')).toEqual(['e', 'b']);
  });

  it('keeps every metric on the moved slot', () => {
    const edited = builderReducer(state, { type: 'updateSlot', slotId: 'a', patch: { sets: 7, repMin: 6, repMax: 9, rir: 0, weight: 55 } });
    const action = resolveDrop(edited, 'a', dayDropId('d3'));
    const next = action ? builderReducer(edited, action) : edited;
    expect(next.days[2]?.slots[0]).toMatchObject({ id: 'a', sets: 7, repMin: 6, repMax: 9, rir: 0, weight: 55 });
  });
});

describe('describeMove', () => {
  it('describes a move to another day with the new position', () => {
    const action = resolveDrop(state, 'a', 'e');
    expect(action && describeMove(state, action)).toBe('Moved Ex a to Day 2, position 1 of 2.');
  });

  it('describes a reorder within a day', () => {
    const action = resolveDrop(state, 'c', 'a');
    expect(action && describeMove(state, action)).toBe('Moved Ex c within Day 1, position 1 of 3.');
  });

  it('handles an unknown slot', () => {
    expect(describeMove(state, { type: 'moveSlot', slotId: 'zzz', toDayId: 'd1', beforeSlotId: null })).toBe('Nothing was moved.');
  });
});

describe('resolveDayDrop', () => {
  it('moves a day to the position of the column it is dropped on and relabels by position', () => {
    const action = resolveDayDrop(state, columnId('d2'), columnId('d1'));
    expect(action).toEqual({ type: 'moveDay', dayId: 'd2', toIndex: 0 });
    const next = builderReducer(state, action!);
    expect(next.days.map((d) => d.id)).toEqual(['d2', 'd1', 'd3']);
    expect(next.days.map((d) => d.name)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(order(next, 'd2')).toEqual(['e']);
    expect(describeDayMove(state, action!)).toBe('Day 2 moved to position 1 of 3.');
  });

  it('ignores drops on itself, on cards or day drop targets, and unknown days', () => {
    expect(resolveDayDrop(state, columnId('d1'), columnId('d1'))).toBeNull();
    expect(resolveDayDrop(state, columnId('d1'), 'a')).toBeNull();
    expect(resolveDayDrop(state, columnId('d1'), dayDropId('d2'))).toBeNull();
    expect(resolveDayDrop(state, 'a', columnId('d2'))).toBeNull();
    expect(resolveDayDrop(state, columnId('zz'), columnId('d2'))).toBeNull();
    expect(resolveDayDrop(state, columnId('d1'), columnId('zz'))).toBeNull();
  });
});
