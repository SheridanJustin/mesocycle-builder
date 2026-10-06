import { dayDropId, dayIdFromDropId, isDayDropId } from './drop';
import { findSlot } from './reducer';
import type { BuilderState } from './types';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

// Where a keyboard drag goes next. `currentOverId` is what the dragged card is currently over
// (null before the first arrow press).
// - Up/Down walk the cards of the day the drag is currently in.
// - Left/Right jump to the neighbouring day's column (dropping there appends to that day).
// Returns null when there is nowhere to go.
export function keyboardTarget(state: BuilderState, activeId: string, currentOverId: string | null, key: ArrowKey): string | null {
  if (!findSlot(state, activeId)) return null;
  const current = currentOverId ?? activeId;
  const currentDay = isDayDropId(current) ? state.days.find((d) => d.id === dayIdFromDropId(current)) : findSlot(state, current)?.day;
  if (!currentDay) return null;

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const next = state.days[state.days.findIndex((d) => d.id === currentDay.id) + (key === 'ArrowRight' ? 1 : -1)];
    return next ? dayDropId(next.id) : null;
  }

  if (isDayDropId(current)) return key === 'ArrowDown' ? (currentDay.slots[0]?.id ?? null) : null;
  const target = currentDay.slots[currentDay.slots.findIndex((s) => s.id === current) + (key === 'ArrowDown' ? 1 : -1)];
  return target ? target.id : null;
}
