import {
  DEFAULT_REP_RANGE_MAX,
  DEFAULT_REP_RANGE_MIN,
  DEFAULT_RIR,
  DEFAULT_SLOT_SETS,
  MAX_DAYS_PER_WEEK,
  type Exercise,
  type Muscle,
  type Priority,
} from '@mesocycle/shared';
import { newId } from './ids';
import type { BuilderDay, BuilderSlot, BuilderState, SlotMetrics } from './types';

export type BuilderAction =
  | { type: 'hydrate'; state: BuilderState }
  | { type: 'addDay'; dayId: string }
  | { type: 'removeDay'; dayId: string }
  | { type: 'renameDay'; dayId: string; name: string }
  | { type: 'setWeekday'; dayId: string; weekday: number | null }
  | { type: 'addMuscle'; dayId: string; muscle: Muscle }
  | { type: 'removeMuscle'; dayId: string; muscle: Muscle }
  | { type: 'addSlot'; dayId: string; muscle: Muscle; exercise: Exercise; slotId: string }
  | { type: 'removeSlot'; slotId: string }
  | { type: 'updateSlot'; slotId: string; patch: Partial<SlotMetrics> }
  | { type: 'stepSlot'; slotId: string; direction: 'up' | 'down' }
  | { type: 'moveSlot'; slotId: string; toDayId: string; toMuscle: Muscle; beforeSlotId: string | null }
  | { type: 'setPriority'; muscle: Muscle; priority: Priority };

export const EMPTY_STATE: BuilderState = { days: [], priorities: {} };

export function createSlot(exercise: Exercise, muscle: Muscle, id: string = newId()): BuilderSlot {
  return {
    id,
    muscle,
    exercise,
    sets: DEFAULT_SLOT_SETS,
    repMin: DEFAULT_REP_RANGE_MIN,
    repMax: DEFAULT_REP_RANGE_MAX,
    rir: DEFAULT_RIR,
    weight: null,
  };
}

export function createDay(id: string, name: string): BuilderDay {
  return { id, name, weekday: null, muscles: [], slots: [] };
}

export function findSlot(state: BuilderState, slotId: string): { day: BuilderDay; slot: BuilderSlot } | null {
  for (const day of state.days) {
    const slot = day.slots.find((s) => s.id === slotId);
    if (slot) return { day, slot };
  }
  return null;
}

// Slots of one section, in the day's global order.
export function sectionSlots(day: BuilderDay, muscle: Muscle): BuilderSlot[] {
  return day.slots.filter((slot) => slot.muscle === muscle);
}

function mapDay(state: BuilderState, dayId: string, update: (day: BuilderDay) => BuilderDay): BuilderState {
  return { ...state, days: state.days.map((day) => (day.id === dayId ? update(day) : day)) };
}

function withMuscle(day: BuilderDay, muscle: Muscle): BuilderDay {
  return day.muscles.includes(muscle) ? day : { ...day, muscles: [...day.muscles, muscle] };
}

function moveSlot(
  state: BuilderState,
  slotId: string,
  toDayId: string,
  toMuscle: Muscle,
  beforeSlotId: string | null,
): BuilderState {
  const found = findSlot(state, slotId);
  const target = state.days.find((day) => day.id === toDayId);
  if (!found || !target || beforeSlotId === slotId) return state;

  const moved: BuilderSlot = { ...found.slot, muscle: toMuscle };
  const withoutSlot = state.days.map((day) =>
    day.id === found.day.id ? { ...day, slots: day.slots.filter((s) => s.id !== slotId) } : day,
  );

  return {
    ...state,
    days: withoutSlot.map((day) => {
      if (day.id !== toDayId) return day;
      const slots = [...day.slots];
      const index = beforeSlotId === null ? -1 : slots.findIndex((s) => s.id === beforeSlotId);
      slots.splice(index === -1 ? slots.length : index, 0, moved);
      return withMuscle({ ...day, slots }, toMuscle);
    }),
  };
}

// Swaps a slot with its previous/next sibling in the same section. Positions held by other
// sections stay put, so the day's global order only changes between the two swapped slots.
function stepSlot(state: BuilderState, slotId: string, direction: 'up' | 'down'): BuilderState {
  const found = findSlot(state, slotId);
  if (!found) return state;
  const siblings = sectionSlots(found.day, found.slot.muscle);
  const at = siblings.findIndex((s) => s.id === slotId);
  const other = siblings[direction === 'up' ? at - 1 : at + 1];
  if (!other) return state;

  return mapDay(state, found.day.id, (day) => ({
    ...day,
    slots: day.slots.map((slot) => (slot.id === slotId ? other : slot.id === other.id ? found.slot : slot)),
  }));
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'addDay': {
      if (state.days.length >= MAX_DAYS_PER_WEEK) return state;
      return { ...state, days: [...state.days, createDay(action.dayId, `Day ${state.days.length + 1}`)] };
    }

    case 'removeDay': {
      if (state.days.length <= 1) return state;
      return { ...state, days: state.days.filter((day) => day.id !== action.dayId) };
    }

    case 'renameDay':
      return mapDay(state, action.dayId, (day) => ({ ...day, name: action.name }));

    case 'setWeekday':
      return mapDay(state, action.dayId, (day) => ({ ...day, weekday: action.weekday }));

    case 'addMuscle':
      return mapDay(state, action.dayId, (day) => withMuscle(day, action.muscle));

    case 'removeMuscle':
      return mapDay(state, action.dayId, (day) => ({
        ...day,
        muscles: day.muscles.filter((m) => m !== action.muscle),
        slots: day.slots.filter((s) => s.muscle !== action.muscle),
      }));

    case 'addSlot':
      return mapDay(state, action.dayId, (day) => ({
        ...withMuscle(day, action.muscle),
        slots: [...day.slots, createSlot(action.exercise, action.muscle, action.slotId)],
      }));

    case 'removeSlot':
      return {
        ...state,
        days: state.days.map((day) => ({ ...day, slots: day.slots.filter((s) => s.id !== action.slotId) })),
      };

    case 'updateSlot':
      return {
        ...state,
        days: state.days.map((day) => ({
          ...day,
          slots: day.slots.map((s) => (s.id === action.slotId ? { ...s, ...action.patch } : s)),
        })),
      };

    case 'stepSlot':
      return stepSlot(state, action.slotId, action.direction);

    case 'moveSlot':
      return moveSlot(state, action.slotId, action.toDayId, action.toMuscle, action.beforeSlotId);

    case 'setPriority':
      return { ...state, priorities: { ...state.priorities, [action.muscle]: action.priority } };
  }
}
