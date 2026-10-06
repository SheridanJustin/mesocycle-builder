import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { builderReducer, createSlot, relabel, type BuilderAction } from './reducer';
import type { BuilderDay, BuilderState } from './types';

function exercise(id: string, primary: Exercise['primary_muscle'] = 'chest'): Exercise {
  return { id, name: `Ex ${id}`, primary_muscle: primary, secondary_muscles: [], equipment_type: 'cable', movement_type: 'isolation', is_custom: false };
}

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const day = (id: string, name: string, slotIds: string[] = [], weekday: number | null = null): BuilderDay => ({
  id,
  name,
  weekday,
  slots: slotIds.map((s) => createSlot(exercise(s), s)),
});

// A Mon-Sun week: Mon has a, b, c; Wed has d; the rest are rest days.
const week: BuilderState = {
  mode: 'calendar',
  days: NAMES.map((name, i) => day(`d${i}`, name, i === 0 ? ['a', 'b', 'c'] : i === 2 ? ['d'] : [], i)),
  priorities: {},
};
const numbered = (count: number): BuilderState =>
  relabel({ mode: 'relative', days: Array.from({ length: count }, (_, i) => day(`n${i}`, `Day ${i + 1}`, i === 0 ? ['x'] : [])), priorities: {} });

function run(state: BuilderState, ...actions: BuilderAction[]): BuilderState {
  return actions.reduce(builderReducer, state);
}
const ids = (s: BuilderState, dayId: string) => s.days.find((d) => d.id === dayId)?.slots.map((x) => x.id);
const names = (s: BuilderState) => s.days.map((d) => d.name);

describe('numbered days toggle', () => {
  it('renames generated names to Day 1..7 and drops weekdays', () => {
    const next = run(week, { type: 'setNumbered', numbered: true });
    expect(next.mode).toBe('relative');
    expect(names(next)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']);
    expect(next.days.every((d) => d.weekday === null)).toBe(true);
  });

  it('switches back to Mon-Sun with weekdays 0-6', () => {
    const next = run(week, { type: 'setNumbered', numbered: true }, { type: 'setNumbered', numbered: false });
    expect(names(next)).toEqual(NAMES);
    expect(next.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('keeps names the user typed', () => {
    const next = run(week, { type: 'renameDay', dayId: 'd0', name: 'Push A' }, { type: 'setNumbered', numbered: true });
    expect(names(next)[0]).toBe('Push A');
    expect(names(next)[1]).toBe('Day 2');
  });

  it('refuses weekday names unless there are exactly 7 days', () => {
    const eight = numbered(8);
    expect(run(eight, { type: 'setNumbered', numbered: false })).toBe(eight);
  });
});

describe('adding and removing days', () => {
  it('adding an 8th day switches a week to numbered days', () => {
    const next = run(week, { type: 'addDay', dayId: 'new' });
    expect(next.mode).toBe('relative');
    expect(names(next)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8']);
  });

  it('stops at 10 days', () => {
    let state = numbered(9);
    state = run(state, { type: 'addDay', dayId: 'ten' }, { type: 'addDay', dayId: 'eleven' });
    expect(state.days).toHaveLength(10);
  });

  it('removes numbered days and renumbers the rest, but never below 1', () => {
    let state = run(numbered(3), { type: 'removeDay', dayId: 'n1' });
    expect(names(state)).toEqual(['Day 1', 'Day 2']);
    state = run(state, { type: 'removeDay', dayId: 'n0' }, { type: 'removeDay', dayId: 'n2' });
    expect(state.days).toHaveLength(1);
  });

  it('never removes a day from a Mon-Sun week', () => {
    expect(run(week, { type: 'removeDay', dayId: 'd1' })).toBe(week);
  });

  it('clearing a day turns it into a rest day', () => {
    expect(ids(run(week, { type: 'clearDay', dayId: 'd0' }), 'd0')).toEqual([]);
  });
});

describe('slots', () => {
  it('adds several exercises at once with defaults and their primary muscle', () => {
    const next = run(week, {
      type: 'addSlots',
      dayId: 'd1',
      items: [
        { slotId: 's1', exercise: exercise('p', 'quads') },
        { slotId: 's2', exercise: exercise('q', 'hamstrings') },
      ],
    });
    expect(next.days[1]?.slots.map((s) => [s.id, s.muscle, s.sets, s.repMin, s.repMax, s.rir, s.weight])).toEqual([
      ['s1', 'quads', 3, 8, 12, 3, null],
      ['s2', 'hamstrings', 3, 8, 12, 3, null],
    ]);
  });

  it('updates and removes one slot', () => {
    let next = run(week, { type: 'updateSlot', slotId: 'b', patch: { sets: 5, weight: 60 } });
    expect(next.days[0]?.slots[1]).toMatchObject({ sets: 5, weight: 60 });
    next = run(next, { type: 'removeSlot', slotId: 'b' });
    expect(ids(next, 'd0')).toEqual(['a', 'c']);
  });

  it('moves a slot to another day keeping its metrics, before a slot or at the end', () => {
    const edited = run(week, { type: 'updateSlot', slotId: 'a', patch: { sets: 7, repMin: 6, repMax: 9, rir: 1, weight: 55 } });
    let next = run(edited, { type: 'moveSlot', slotId: 'a', toDayId: 'd2', beforeSlotId: 'd' });
    expect(ids(next, 'd2')).toEqual(['a', 'd']);
    expect(next.days[2]?.slots[0]).toMatchObject({ sets: 7, repMin: 6, repMax: 9, rir: 1, weight: 55 });
    next = run(next, { type: 'moveSlot', slotId: 'b', toDayId: 'd2', beforeSlotId: null });
    expect(ids(next, 'd2')).toEqual(['a', 'd', 'b']);
    expect(ids(next, 'd0')).toEqual(['c']);
  });

  it('ignores moves to unknown days or onto itself', () => {
    expect(run(week, { type: 'moveSlot', slotId: 'a', toDayId: 'nope', beforeSlotId: null })).toBe(week);
    expect(run(week, { type: 'moveSlot', slotId: 'a', toDayId: 'd0', beforeSlotId: 'a' })).toBe(week);
  });
});

describe('copyDay', () => {
  it('copies all exercises with their metrics into another day, as new slots', () => {
    const edited = run(week, { type: 'updateSlot', slotId: 'a', patch: { sets: 6 } });
    const next = run(edited, { type: 'copyDay', sourceDayId: 'd0', targetDayId: 'd3', newDayId: 'unused', slotIds: ['x1', 'x2', 'x3'] });
    expect(ids(next, 'd3')).toEqual(['x1', 'x2', 'x3']);
    expect(next.days[3]?.slots[0]).toMatchObject({ sets: 6, exercise: { id: 'a' } });
    expect(ids(next, 'd0')).toEqual(['a', 'b', 'c']);
  });

  it('inserts a new day right after the source in numbered cycles', () => {
    let state = run(numbered(3), { type: 'renameDay', dayId: 'n0', name: 'Push A' });
    state = run(state, { type: 'copyDay', sourceDayId: 'n0', targetDayId: null, newDayId: 'copy', slotIds: ['c1'] });
    expect(names(state)).toEqual(['Push A', 'Push A (copy)', 'Day 3', 'Day 4']);
    expect(ids(state, 'copy')).toEqual(['c1']);
  });

  it('does not add days to a Mon-Sun week or past 10, nor copy onto itself', () => {
    expect(run(week, { type: 'copyDay', sourceDayId: 'd0', targetDayId: null, newDayId: 'c', slotIds: ['1', '2', '3'] })).toBe(week);
    const ten = numbered(10);
    expect(run(ten, { type: 'copyDay', sourceDayId: 'n0', targetDayId: null, newDayId: 'c', slotIds: ['1'] })).toBe(ten);
    expect(run(week, { type: 'copyDay', sourceDayId: 'd0', targetDayId: 'd0', newDayId: 'c', slotIds: ['1', '2', '3'] })).toBe(week);
  });
});

describe('hydrate', () => {
  it('replaces the whole state', () => {
    expect(run(week, { type: 'hydrate', state: numbered(2) })).toEqual(numbered(2));
  });
});
