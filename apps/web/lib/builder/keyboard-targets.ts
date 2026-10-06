import { dayDropId, isDayDropId, dayIdFromDropId } from './drop';
import { findSlot, sectionSlots } from './reducer';
import type { BuilderState } from './types';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

// Where a keyboard drag goes next. `currentOverId` is what the dragged card is currently over
// (null before the first arrow press).
// - Up/Down walk the cards of the section the drag is currently in (never leaving it).
// - Left/Right jump to the neighbouring day: onto the card in that day's section for the dragged
//   exercise's primary muscle if there is one, otherwise onto the day column itself.
// Returns null when there is nowhere to go (the edge of a section or of the board).
export function keyboardTarget(state: BuilderState, activeId: string, currentOverId: string | null, key: ArrowKey): string | null {
  const active = findSlot(state, activeId);
  if (!active) return null;
  const current = currentOverId ?? activeId;

  const currentDay = isDayDropId(current)
    ? state.days.find((d) => d.id === dayIdFromDropId(current))
    : findSlot(state, current)?.day;
  if (!currentDay) return null;

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const index = state.days.findIndex((d) => d.id === currentDay.id) + (key === 'ArrowRight' ? 1 : -1);
    const next = state.days[index];
    if (!next) return null;
    const inSection = sectionSlots(next, active.slot.exercise.primary_muscle)[0];
    return inSection ? inSection.id : dayDropId(next.id);
  }

  const currentSlot = isDayDropId(current) ? undefined : findSlot(state, current)?.slot;
  if (!currentSlot) {
    // Over a day column: step into its first card when going down.
    return key === 'ArrowDown' ? (currentDay.slots[0]?.id ?? null) : null;
  }
  const siblings = sectionSlots(currentDay, currentSlot.muscle);
  const target = siblings[siblings.findIndex((s) => s.id === current) + (key === 'ArrowDown' ? 1 : -1)];
  return target ? target.id : null;
}
