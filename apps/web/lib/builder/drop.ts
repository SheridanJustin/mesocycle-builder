import { builderReducer, findSlot, type BuilderAction } from './reducer';
import type { BuilderState } from './types';

export const DAY_DROP_PREFIX = 'day:';
export const dayDropId = (dayId: string): string => `${DAY_DROP_PREFIX}${dayId}`;
export const isDayDropId = (id: string): boolean => id.startsWith(DAY_DROP_PREFIX);
export const dayIdFromDropId = (id: string): string => id.slice(DAY_DROP_PREFIX.length);

// Day columns are sortable too. Their sortable ids differ from their card drop-target ids.
export const COLUMN_PREFIX = 'col:';
export const columnId = (dayId: string): string => `${COLUMN_PREFIX}${dayId}`;
export const isColumnId = (id: string): boolean => id.startsWith(COLUMN_PREFIX);
export const dayIdFromColumnId = (id: string): string => id.slice(COLUMN_PREFIX.length);

export type MoveAction = Extract<BuilderAction, { type: 'moveSlot' }>;
export type MoveDayAction = Extract<BuilderAction, { type: 'moveDay' }>;

// Dropping day column `activeId` on another column moves the day to that column's position.
export function resolveDayDrop(state: BuilderState, activeId: string, overId: string): MoveDayAction | null {
  if (!isColumnId(activeId) || !isColumnId(overId) || activeId === overId) return null;
  const dayId = dayIdFromColumnId(activeId);
  const toIndex = state.days.findIndex((d) => d.id === dayIdFromColumnId(overId));
  if (toIndex === -1 || !state.days.some((d) => d.id === dayId)) return null;
  return { type: 'moveDay', dayId, toIndex };
}

export function describeDayMove(state: BuilderState, action: MoveDayAction): string {
  const day = state.days.find((d) => d.id === action.dayId);
  return `${day?.name ?? 'Day'} moved to position ${action.toIndex + 1} of ${state.days.length}.`;
}

// Decides what dropping slot `activeId` onto `overId` (another slot, or a day column) means.
// - Same day: reorder with the usual sortable convention (dropping on a card below puts the
//   dragged card after it, dropping on a card above puts it before).
// - Another day: land before the card it was dropped on, or at the end when dropped on the column.
// - Dropping on the source day's own column background does nothing.
export function resolveDrop(state: BuilderState, activeId: string, overId: string): MoveAction | null {
  const active = findSlot(state, activeId);
  if (!active || activeId === overId) return null;

  if (isDayDropId(overId)) {
    const toDayId = dayIdFromDropId(overId);
    if (toDayId === active.day.id || !state.days.some((d) => d.id === toDayId)) return null;
    return { type: 'moveSlot', slotId: activeId, toDayId, beforeSlotId: null };
  }

  const over = findSlot(state, overId);
  if (!over) return null;

  if (over.day.id === active.day.id) {
    const slots = active.day.slots;
    const from = slots.findIndex((s) => s.id === activeId);
    const to = slots.findIndex((s) => s.id === overId);
    const beforeSlotId = from < to ? (slots[to + 1]?.id ?? null) : overId;
    return { type: 'moveSlot', slotId: activeId, toDayId: active.day.id, beforeSlotId };
  }

  return { type: 'moveSlot', slotId: activeId, toDayId: over.day.id, beforeSlotId: overId };
}

// Screen-reader text for a completed move, e.g. "Moved Cable Fly to Wed, position 2 of 2."
export function describeMove(state: BuilderState, action: MoveAction): string {
  const before = findSlot(state, action.slotId);
  const after = findSlot(builderReducer(state, action), action.slotId);
  if (!before || !after) return 'Nothing was moved.';
  const position = after.day.slots.findIndex((s) => s.id === action.slotId) + 1;
  const place = `${after.day.name}, position ${position} of ${after.day.slots.length}`;
  return before.day.id === after.day.id
    ? `Moved ${after.slot.exercise.name} within ${place}.`
    : `Moved ${after.slot.exercise.name} to ${place}.`;
}
