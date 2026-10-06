import type { Exercise, VolumeSummary } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { isValidSlotMetrics, stepCompletion } from './completion';
import { createDay, createSlot } from './reducer';
import type { BuilderState } from './types';

const ex: Exercise = {
  id: 'x',
  name: 'X',
  primary_muscle: 'chest',
  secondary_muscles: [],
  equipment_type: 'cable',
  movement_type: 'isolation',
  is_custom: false,
};
const empty: VolumeSummary = { summary: {} };
const exceeds = { summary: { chest: { status: 'EXCEEDS_MRV' } } } as unknown as VolumeSummary;

function complete(): BuilderState {
  return {
    days: [{ ...createDay('d1', 'Push'), muscles: ['chest'], slots: [createSlot(ex, 'chest', 's1')] }],
    priorities: {},
  };
}

describe('stepCompletion', () => {
  it('marks everything but review complete for a finished board', () => {
    expect(stepCompletion(complete(), 'relative', empty, false)).toEqual({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: false });
  });

  it('completes review only once opened', () => {
    expect(stepCompletion(complete(), 'relative', empty, true)[6]).toBe(true);
  });

  it('step 1 needs named days, and unique weekdays in calendar mode', () => {
    const s = complete();
    expect(stepCompletion({ days: [], priorities: {} }, 'relative', empty, false)[1]).toBe(false);
    expect(stepCompletion({ ...s, days: [{ ...s.days[0]!, name: ' ' }] }, 'relative', empty, false)[1]).toBe(false);
    expect(stepCompletion(s, 'calendar', empty, false)[1]).toBe(false);
    const withWeekday = { ...s, days: [{ ...s.days[0]!, weekday: 1 }] };
    expect(stepCompletion(withWeekday, 'calendar', empty, false)[1]).toBe(true);
    const dupes: BuilderState = { ...s, days: [{ ...s.days[0]!, weekday: 1 }, { ...createDay('d2', 'B'), weekday: 1, muscles: ['chest'] }] };
    expect(stepCompletion(dupes, 'calendar', empty, false)[1]).toBe(false);
  });

  it('step 2 needs a muscle group on every day', () => {
    const s = complete();
    const extra = { ...s, days: [...s.days, createDay('d2', 'Empty')] };
    expect(stepCompletion(extra, 'relative', empty, false)[2]).toBe(false);
  });

  it('step 3 needs an exercise in every muscle group', () => {
    const s = complete();
    const noSlots = { ...s, days: [{ ...s.days[0]!, slots: [] }] };
    expect(stepCompletion(noSlots, 'relative', empty, false)).toMatchObject({ 2: true, 3: false, 4: false, 5: false });
    const partial: BuilderState = { ...s, days: [{ ...s.days[0]!, muscles: ['chest', 'triceps'] }] };
    expect(stepCompletion(partial, 'relative', empty, false)[3]).toBe(false);
  });

  it('step 4 needs valid metrics on every slot', () => {
    const s = complete();
    const bad = { ...s, days: [{ ...s.days[0]!, slots: [{ ...s.days[0]!.slots[0]!, repMin: 12, repMax: 12 }] }] };
    expect(stepCompletion(bad, 'relative', empty, false)[4]).toBe(false);
  });

  it('step 5 fails when any muscle exceeds MRV', () => {
    expect(stepCompletion(complete(), 'relative', exceeds, false)[5]).toBe(false);
  });
});

describe('isValidSlotMetrics', () => {
  const slot = createSlot(ex, 'chest', 's');
  it.each([
    [{}, true],
    [{ sets: 0 }, false],
    [{ sets: 11 }, false],
    [{ sets: 2.5 }, false],
    [{ repMin: 0 }, false],
    [{ repMax: 51 }, false],
    [{ repMin: 10, repMax: 10 }, false],
    [{ rir: -1 }, false],
    [{ rir: 6 }, false],
    [{ weight: -1 }, false],
    [{ weight: 0 }, true],
  ])('%j -> %s', (patch, expected) => {
    expect(isValidSlotMetrics({ ...slot, ...patch })).toBe(expected);
  });
});
