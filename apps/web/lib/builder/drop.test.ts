import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { dayDropId, describeMove, resolveDrop } from './drop';
import { builderReducer, createDay, createSlot, sectionSlots } from './reducer';
import type { BuilderState } from './types';

function exercise(id: string, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return { id, name: `Ex ${id}`, primary_muscle: primary, secondary_muscles: [], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
}

// Day 1: chest [a, c, d] + triceps [b] (global order a, b, c, d). Day 2: chest [e], quads [f]. Day 3: empty.
const state: BuilderState = {
  days: [
    { ...createDay('d1', 'Day 1'), muscles: ['chest', 'triceps'], slots: [createSlot(exercise('a'), 'chest', 'a'), createSlot(exercise('b', 'triceps'), 'triceps', 'b'), createSlot(exercise('c'), 'chest', 'c'), createSlot(exercise('d'), 'chest', 'd')] },
    { ...createDay('d2', 'Day 2'), muscles: ['chest', 'quads'], slots: [createSlot(exercise('e'), 'chest', 'e'), createSlot(exercise('f', 'quads'), 'quads', 'f')] },
    createDay('d3', 'Day 3'),
  ],
  priorities: {},
};

const order = (s: BuilderState, dayId: string) => s.days.find((d) => d.id === dayId)?.slots.map((x) => x.id);
const chest = (s: BuilderState) => sectionSlots(s.days[0]!, 'chest').map((x) => x.id);
const apply = (activeId: string, overId: string) => {
  const action = resolveDrop(state, activeId, overId);
  return action ? builderReducer(state, action) : state;
};

describe('resolveDrop within a section', () => {
  it('dropping on a card above puts the dragged card before it', () => {
    expect(chest(apply('d', 'a'))).toEqual(['d', 'a', 'c']);
    expect(chest(apply('c', 'a'))).toEqual(['c', 'a', 'd']);
    expect(order(apply('d', 'a'), 'd1')).toEqual(['d', 'a', 'b', 'c']);
  });

  it('dropping on a card below puts the dragged card after it', () => {
    // The chest section is a, c, d. Dragging a onto c gives c, a, d; onto d gives c, d, a.
    expect(chest(apply('a', 'c'))).toEqual(['c', 'a', 'd']);
    expect(chest(apply('a', 'd'))).toEqual(['c', 'd', 'a']);
    // Slots of other sections keep their place in the day's global order.
    expect(order(apply('a', 'c'), 'd1')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('does nothing when dropped on itself or an unknown target', () => {
    expect(resolveDrop(state, 'a', 'a')).toBeNull();
    expect(resolveDrop(state, 'a', 'nope')).toBeNull();
    expect(resolveDrop(state, 'nope', 'a')).toBeNull();
  });
});

describe('resolveDrop across sections of one day', () => {
  it('joins the section of the card it was dropped on', () => {
    const next = apply('a', 'b');
    const moved = next.days[0]?.slots.find((s) => s.id === 'a');
    expect(moved?.muscle).toBe('triceps');
    expect(sectionSlots(next.days[0]!, 'triceps').map((s) => s.id)).toEqual(['a', 'b']);
    expect(chest(next)).toEqual(['c', 'd']);
  });
});

describe('resolveDrop across days', () => {
  it('lands in the existing primary-muscle section, before the card it was dropped on', () => {
    const next = apply('a', 'e');
    expect(order(next, 'd2')).toEqual(['a', 'e', 'f']);
    expect(order(next, 'd1')).toEqual(['b', 'c', 'd']);
    expect(next.days[1]?.slots[0]?.muscle).toBe('chest');
  });

  it('dropping on a card of another section appends and uses the primary-muscle section', () => {
    const next = apply('a', 'f');
    expect(next.days[1]?.slots.find((s) => s.id === 'a')?.muscle).toBe('chest');
    expect(order(next, 'd2')).toEqual(['e', 'f', 'a']);
  });

  it('creates the primary-muscle section when the destination lacks it', () => {
    const next = apply('b', dayDropId('d3'));
    expect(next.days[2]?.muscles).toEqual(['triceps']);
    expect(order(next, 'd3')).toEqual(['b']);
  });

  it('keeps every metric on the moved slot', () => {
    const edited = builderReducer(state, { type: 'updateSlot', slotId: 'a', patch: { sets: 7, repMin: 6, repMax: 9, rir: 0, weight: 55 } });
    const action = resolveDrop(edited, 'a', dayDropId('d3'));
    const next = action ? builderReducer(edited, action) : edited;
    expect(next.days[2]?.slots[0]).toMatchObject({ id: 'a', sets: 7, repMin: 6, repMax: 9, rir: 0, weight: 55 });
  });

  it('ignores a drop on the source day column or an unknown column', () => {
    expect(resolveDrop(state, 'a', dayDropId('d1'))).toBeNull();
    expect(resolveDrop(state, 'a', dayDropId('nope'))).toBeNull();
  });
});

describe('describeMove', () => {
  it('describes a cross-day move with the new position', () => {
    const action = resolveDrop(state, 'a', 'e');
    expect(action && describeMove(state, action)).toBe('Moved Ex a to Day 2, Chest section, position 1 of 2.');
  });

  it('describes a reorder within a section', () => {
    const action = resolveDrop(state, 'd', 'a');
    expect(action && describeMove(state, action)).toBe('Moved Ex d within Day 1, Chest section, position 1 of 3.');
  });

  it('handles an unknown slot', () => {
    expect(describeMove(state, { type: 'moveSlot', slotId: 'zzz', toDayId: 'd1', toMuscle: 'chest', beforeSlotId: null })).toBe('Nothing was moved.');
  });
});
