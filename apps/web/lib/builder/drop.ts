import { muscleLabel } from '../labels';
import { builderReducer, findSlot, sectionSlots, type BuilderAction } from './reducer';
import type { BuilderState } from './types';

export const DAY_DROP_PREFIX = 'day:';
export const dayDropId = (dayId: string): string => `${DAY_DROP_PREFIX}${dayId}`;
export const isDayDropId = (id: string): boolean => id.startsWith(DAY_DROP_PREFIX);
export const dayIdFromDropId = (id: string): string => id.slice(DAY_DROP_PREFIX.length);

export type MoveAction = Extract<BuilderAction, { type: 'moveSlot' }>;

// Decides what dropping slot `activeId` onto `overId` (another slot, or a day column) means.
// - Same section: reorder, using the usual sortable convention (dropping on a card below puts the
//   dragged card after it, dropping on a card above puts it before).
// - Another section of the same day: join that section next to the card it was dropped on.
// - Another day: land in that day's section for the exercise's primary muscle, creating it if
//   missing (SPEC 10.4); next to the card it was dropped on when that card is in the same section.
// - Dropping on the source day's own column background does nothing.
export function resolveDrop(state: BuilderState, activeId: string, overId: string): MoveAction | null {
  const active = findSlot(state, activeId);
  if (!active || activeId === overId) return null;
  const { slot } = active;

  if (isDayDropId(overId)) {
    const toDayId = dayIdFromDropId(overId);
    if (toDayId === active.day.id || !state.days.some((d) => d.id === toDayId)) return null;
    return { type: 'moveSlot', slotId: activeId, toDayId, toMuscle: slot.exercise.primary_muscle, beforeSlotId: null };
  }

  const over = findSlot(state, overId);
  if (!over) return null;

  if (over.day.id === active.day.id) {
    if (over.slot.muscle !== slot.muscle) {
      return { type: 'moveSlot', slotId: activeId, toDayId: over.day.id, toMuscle: over.slot.muscle, beforeSlotId: overId };
    }
    const siblings = sectionSlots(active.day, slot.muscle);
    const from = siblings.findIndex((s) => s.id === activeId);
    const to = siblings.findIndex((s) => s.id === overId);
    const beforeSlotId = from < to ? (siblings[to + 1]?.id ?? null) : overId;
    return { type: 'moveSlot', slotId: activeId, toDayId: active.day.id, toMuscle: slot.muscle, beforeSlotId };
  }

  const toMuscle = slot.exercise.primary_muscle;
  return {
    type: 'moveSlot',
    slotId: activeId,
    toDayId: over.day.id,
    toMuscle,
    beforeSlotId: over.slot.muscle === toMuscle ? overId : null,
  };
}

// Screen-reader text for a completed move, e.g. "Moved Cable Fly to Day 3, Chest section, position 2 of 2."
export function describeMove(state: BuilderState, action: MoveAction): string {
  const before = findSlot(state, action.slotId);
  const next = builderReducer(state, action);
  const after = findSlot(next, action.slotId);
  if (!before || !after) return 'Nothing was moved.';
  const name = after.slot.exercise.name;
  const siblings = sectionSlots(after.day, after.slot.muscle);
  const position = siblings.findIndex((s) => s.id === action.slotId) + 1;
  const place = `${after.day.name}, ${muscleLabel(after.slot.muscle)} section, position ${position} of ${siblings.length}`;
  return before.day.id === after.day.id && before.slot.muscle === after.slot.muscle
    ? `Moved ${name} within ${place}.`
    : `Moved ${name} to ${place}.`;
}
