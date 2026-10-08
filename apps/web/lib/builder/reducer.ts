import {
  DEFAULT_REP_RANGE_MAX,
  DEFAULT_REP_RANGE_MIN,
  DEFAULT_RIR,
  DEFAULT_SLOT_SETS,
  MAX_CYCLE_DAYS,
  MIN_CYCLE_DAYS,
  WEEK_DAYS,
  type Exercise,
} from '@mesocycle/shared';
import { autoDayName, defaultCopyName, isAutoDayName } from '../days';
import type { BuilderDay, BuilderSlot, BuilderState, SlotMetrics } from './types';

export type BuilderAction =
  | { type: 'hydrate'; state: BuilderState }
  // Replaces the whole schedule (e.g. with a template). Unlike hydrate, this is a user edit and is saved.
  | { type: 'replace'; state: BuilderState }
  // Moves a day column to another position; generated names follow the new position.
  | { type: 'moveDay'; dayId: string; toIndex: number }
  | { type: 'addDay'; dayId: string }
  | { type: 'removeDay'; dayId: string }
  | { type: 'clearDay'; dayId: string }
  | { type: 'renameDay'; dayId: string; name: string }
  | { type: 'setNumbered'; numbered: boolean }
  | { type: 'addSlots'; dayId: string; items: { slotId: string; exercise: Exercise }[] }
  | { type: 'removeSlot'; slotId: string }
  | { type: 'updateSlot'; slotId: string; patch: Partial<SlotMetrics> }
  | { type: 'moveSlot'; slotId: string; toDayId: string; beforeSlotId: string | null }
  // Copies a day's exercises into another day, or (targetDayId null) into a new day right after it.
  | { type: 'copyDay'; sourceDayId: string; targetDayId: string | null; newDayId: string; slotIds: string[] };

export const EMPTY_STATE: BuilderState = { mode: 'calendar', days: [], priorities: {} };

export function createSlot(exercise: Exercise, id: string): BuilderSlot {
  return {
    id,
    muscle: exercise.primary_muscle,
    exercise,
    sets: DEFAULT_SLOT_SETS,
    repMin: DEFAULT_REP_RANGE_MIN,
    repMax: DEFAULT_REP_RANGE_MAX,
    rir: DEFAULT_RIR,
    weight: null,
  };
}

export function findSlot(state: BuilderState, slotId: string): { day: BuilderDay; slot: BuilderSlot } | null {
  for (const day of state.days) {
    const slot = day.slots.find((s) => s.id === slotId);
    if (slot) return { day, slot };
  }
  return null;
}

// Keeps generated names and weekdays in step with mode and position. Names the user typed stay.
export function relabel(state: BuilderState): BuilderState {
  return {
    ...state,
    days: state.days.map((day, index) => ({
      ...day,
      weekday: state.mode === 'calendar' ? index : null,
      name: isAutoDayName(day.name) ? autoDayName(state.mode, index) : day.name,
    })),
  };
}

function mapDay(state: BuilderState, dayId: string, update: (day: BuilderDay) => BuilderDay): BuilderState {
  return { ...state, days: state.days.map((day) => (day.id === dayId ? update(day) : day)) };
}

function mapSlots(state: BuilderState, update: (slots: BuilderSlot[]) => BuilderSlot[]): BuilderState {
  return { ...state, days: state.days.map((day) => ({ ...day, slots: update(day.slots) })) };
}

function moveSlot(state: BuilderState, slotId: string, toDayId: string, beforeSlotId: string | null): BuilderState {
  const found = findSlot(state, slotId);
  if (!found || beforeSlotId === slotId || !state.days.some((d) => d.id === toDayId)) return state;
  const withoutSlot = mapSlots(state, (slots) => slots.filter((s) => s.id !== slotId));
  return mapDay(withoutSlot, toDayId, (day) => {
    const slots = [...day.slots];
    const index = beforeSlotId === null ? -1 : slots.findIndex((s) => s.id === beforeSlotId);
    slots.splice(index === -1 ? slots.length : index, 0, found.slot);
    return { ...day, slots };
  });
}

function copyDay(state: BuilderState, action: Extract<BuilderAction, { type: 'copyDay' }>): BuilderState {
  const sourceIndex = state.days.findIndex((d) => d.id === action.sourceDayId);
  const source = state.days[sourceIndex];
  if (!source || action.slotIds.length !== source.slots.length) return state;
  const copies = source.slots.map((slot, i) => ({ ...slot, id: action.slotIds[i] as string }));

  if (action.targetDayId !== null) {
    if (action.targetDayId === source.id) return state;
    return mapDay(state, action.targetDayId, (day) => ({ ...day, slots: [...day.slots, ...copies] }));
  }

  // A new day only fits numbered cycles below the 10-day limit.
  if (state.mode === 'calendar' || state.days.length >= MAX_CYCLE_DAYS) return state;
  const name = isAutoDayName(source.name) ? `Day ${sourceIndex + 2}` : defaultCopyName(source.name);
  const days = [...state.days];
  days.splice(sourceIndex + 1, 0, { id: action.newDayId, name, weekday: null, slots: copies });
  return relabel({ ...state, days });
}

function moveDay(state: BuilderState, dayId: string, toIndex: number): BuilderState {
  const from = state.days.findIndex((day) => day.id === dayId);
  const to = Math.min(Math.max(toIndex, 0), state.days.length - 1);
  if (from === -1 || from === to) return state;
  const days = [...state.days];
  const [day] = days.splice(from, 1);
  days.splice(to, 0, day as BuilderDay);
  return relabel({ ...state, days });
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'hydrate':
    case 'replace':
      return action.state;

    case 'moveDay':
      return moveDay(state, action.dayId, action.toIndex);

    case 'addDay': {
      if (state.days.length >= MAX_CYCLE_DAYS) return state;
      // A Mon-Sun week is always full, so adding a day switches the cycle to numbered days.
      const days = [...state.days, { id: action.dayId, name: `Day ${state.days.length + 1}`, weekday: null, slots: [] }];
      return relabel({ ...state, mode: 'relative', days });
    }

    case 'removeDay': {
      // A Mon-Sun week always has 7 days; clear a day instead to make it a rest day.
      if (state.mode === 'calendar' || state.days.length <= MIN_CYCLE_DAYS) return state;
      return relabel({ ...state, days: state.days.filter((day) => day.id !== action.dayId) });
    }

    case 'clearDay':
      return mapDay(state, action.dayId, (day) => ({ ...day, slots: [] }));

    case 'renameDay':
      return mapDay(state, action.dayId, (day) => ({ ...day, name: action.name }));

    case 'setNumbered': {
      if (!action.numbered && state.days.length !== WEEK_DAYS) return state;
      return relabel({ ...state, mode: action.numbered ? 'relative' : 'calendar' });
    }

    case 'addSlots':
      return mapDay(state, action.dayId, (day) => ({
        ...day,
        slots: [...day.slots, ...action.items.map((item) => createSlot(item.exercise, item.slotId))],
      }));

    case 'removeSlot':
      return mapSlots(state, (slots) => slots.filter((s) => s.id !== action.slotId));

    case 'updateSlot':
      return mapSlots(state, (slots) => slots.map((s) => (s.id === action.slotId ? { ...s, ...action.patch } : s)));

    case 'moveSlot':
      return moveSlot(state, action.slotId, action.toDayId, action.beforeSlotId);

    case 'copyDay':
      return copyDay(state, action);
  }
}
