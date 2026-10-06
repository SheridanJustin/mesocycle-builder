import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { builderReducer, createDay, createSlot, sectionSlots, type BuilderAction } from './reducer';
import type { BuilderState } from './types';

function exercise(id: string, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return {
    id,
    name: `Ex ${id}`,
    primary_muscle: primary,
    secondary_muscles: [],
    equipment_type: 'cable',
    movement_type: 'isolation',
    is_custom: false,
  };
}

function run(state: BuilderState, ...actions: BuilderAction[]): BuilderState {
  return actions.reduce(builderReducer, state);
}

const base: BuilderState = {
  days: [
    { ...createDay('d1', 'Day 1'), muscles: ['chest', 'triceps'], slots: [createSlot(exercise('a'), 'chest', 's-a'), createSlot(exercise('b', 'triceps'), 'triceps', 's-b'), createSlot(exercise('c'), 'chest', 's-c'), createSlot(exercise('d'), 'chest', 's-d')] },
    { ...createDay('d2', 'Day 2'), muscles: ['quads'], slots: [createSlot(exercise('e', 'quads'), 'quads', 's-e')] },
    createDay('d3', 'Day 3'),
  ],
  priorities: {},
};

const ids = (state: BuilderState, dayId: string) => state.days.find((d) => d.id === dayId)?.slots.map((s) => s.id);

describe('days', () => {
  it('adds days up to 6 and names them', () => {
    let state: BuilderState = { days: [], priorities: {} };
    for (let i = 1; i <= 8; i++) state = run(state, { type: 'addDay', dayId: `n${i}` });
    expect(state.days.map((d) => d.name)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6']);
  });

  it('removes a day but never the last one', () => {
    const state = run(base, { type: 'removeDay', dayId: 'd2' }, { type: 'removeDay', dayId: 'd3' }, { type: 'removeDay', dayId: 'd1' });
    expect(state.days.map((d) => d.id)).toEqual(['d1']);
  });

  it('renames and sets weekdays', () => {
    const state = run(base, { type: 'renameDay', dayId: 'd1', name: 'Push A' }, { type: 'setWeekday', dayId: 'd1', weekday: 2 });
    expect(state.days[0]).toMatchObject({ name: 'Push A', weekday: 2 });
    expect(state.days[1]).toMatchObject({ name: 'Day 2', weekday: null });
  });
});

describe('muscle groups', () => {
  it('adds a muscle once', () => {
    const state = run(base, { type: 'addMuscle', dayId: 'd3', muscle: 'lats' }, { type: 'addMuscle', dayId: 'd3', muscle: 'lats' });
    expect(state.days[2]?.muscles).toEqual(['lats']);
  });

  it('removing a muscle removes its slots only', () => {
    const state = run(base, { type: 'removeMuscle', dayId: 'd1', muscle: 'chest' });
    expect(state.days[0]?.muscles).toEqual(['triceps']);
    expect(ids(state, 'd1')).toEqual(['s-b']);
  });

  it('sets priorities per muscle', () => {
    const state = run(base, { type: 'setPriority', muscle: 'chest', priority: 'focus' });
    expect(state.priorities).toEqual({ chest: 'focus' });
  });
});

describe('slots', () => {
  it('adds a slot with defaults and creates its section if missing', () => {
    const state = run(base, { type: 'addSlot', dayId: 'd3', muscle: 'lats', exercise: exercise('x', 'lats'), slotId: 'new' });
    expect(state.days[2]?.muscles).toEqual(['lats']);
    expect(state.days[2]?.slots[0]).toMatchObject({ id: 'new', muscle: 'lats', sets: 3, repMin: 8, repMax: 12, rir: 3, weight: null });
  });

  it('updates metrics for one slot only', () => {
    const state = run(base, { type: 'updateSlot', slotId: 's-a', patch: { sets: 5, weight: 100 } });
    expect(state.days[0]?.slots[0]).toMatchObject({ sets: 5, weight: 100 });
    expect(state.days[0]?.slots[2]?.sets).toBe(3);
  });

  it('removes a slot', () => {
    expect(ids(run(base, { type: 'removeSlot', slotId: 's-c' }), 'd1')).toEqual(['s-a', 's-b', 's-d']);
  });
});

describe('stepSlot (move up / down within a section)', () => {
  it('swaps with the previous sibling, skipping slots of other sections', () => {
    // chest slots are a, c, d (b is triceps at index 1): moving c up swaps with a.
    expect(ids(run(base, { type: 'stepSlot', slotId: 's-c', direction: 'up' }), 'd1')).toEqual(['s-c', 's-b', 's-a', 's-d']);
  });

  it('swaps with the next sibling', () => {
    expect(ids(run(base, { type: 'stepSlot', slotId: 's-a', direction: 'down' }), 'd1')).toEqual(['s-c', 's-b', 's-a', 's-d']);
  });

  it('does nothing at the section edges or for an unknown slot', () => {
    expect(run(base, { type: 'stepSlot', slotId: 's-a', direction: 'up' })).toBe(base);
    expect(run(base, { type: 'stepSlot', slotId: 's-d', direction: 'down' })).toBe(base);
    expect(run(base, { type: 'stepSlot', slotId: 's-b', direction: 'up' })).toBe(base);
    expect(run(base, { type: 'stepSlot', slotId: 'nope', direction: 'up' })).toBe(base);
  });
});

describe('moveSlot', () => {
  it('reorders within a day before a given slot', () => {
    const state = run(base, { type: 'moveSlot', slotId: 's-d', toDayId: 'd1', toMuscle: 'chest', beforeSlotId: 's-a' });
    expect(ids(state, 'd1')).toEqual(['s-d', 's-a', 's-b', 's-c']);
  });

  it('appends when there is no before slot', () => {
    const state = run(base, { type: 'moveSlot', slotId: 's-a', toDayId: 'd1', toMuscle: 'chest', beforeSlotId: null });
    expect(ids(state, 'd1')).toEqual(['s-b', 's-c', 's-d', 's-a']);
  });

  it('moves across days keeping every metric and creating the section', () => {
    let state = run(base, { type: 'updateSlot', slotId: 's-a', patch: { sets: 5, repMin: 6, repMax: 10, rir: 1, weight: 102.5 } });
    state = run(state, { type: 'moveSlot', slotId: 's-a', toDayId: 'd3', toMuscle: 'chest', beforeSlotId: null });
    expect(ids(state, 'd1')).toEqual(['s-b', 's-c', 's-d']);
    expect(state.days[2]?.muscles).toEqual(['chest']);
    expect(state.days[2]?.slots[0]).toMatchObject({ id: 's-a', muscle: 'chest', sets: 5, repMin: 6, repMax: 10, rir: 1, weight: 102.5 });
  });

  it('reuses an existing destination section and inserts before the given slot', () => {
    const state = run(base, { type: 'moveSlot', slotId: 's-a', toDayId: 'd2', toMuscle: 'quads', beforeSlotId: 's-e' });
    expect(state.days[1]?.muscles).toEqual(['quads']);
    expect(ids(state, 'd2')).toEqual(['s-a', 's-e']);
    expect(state.days[1]?.slots[0]?.muscle).toBe('quads');
  });

  it('keeps other sections in place when a slot changes section within a day', () => {
    const state = run(base, { type: 'moveSlot', slotId: 's-a', toDayId: 'd1', toMuscle: 'triceps', beforeSlotId: null });
    expect(sectionSlots(state.days[0] as BuilderState['days'][number], 'triceps').map((s) => s.id)).toEqual(['s-b', 's-a']);
  });

  it('ignores unknown ids and self-targeting', () => {
    expect(run(base, { type: 'moveSlot', slotId: 'nope', toDayId: 'd1', toMuscle: 'chest', beforeSlotId: null })).toBe(base);
    expect(run(base, { type: 'moveSlot', slotId: 's-a', toDayId: 'nope', toMuscle: 'chest', beforeSlotId: null })).toBe(base);
    expect(run(base, { type: 'moveSlot', slotId: 's-a', toDayId: 'd1', toMuscle: 'chest', beforeSlotId: 's-a' })).toBe(base);
  });

  it('hydrate replaces the whole state', () => {
    expect(run(base, { type: 'hydrate', state: { days: [], priorities: {} } })).toEqual({ days: [], priorities: {} });
  });
});
