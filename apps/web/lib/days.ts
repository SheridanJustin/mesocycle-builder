import { MAX_DAY_NAME_LENGTH, type ScheduleMode } from '@mesocycle/shared';

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// Default column names: Mon-Sun in calendar mode (exactly 7 days), "Day 1..N" when numbered.
export function autoDayName(mode: ScheduleMode, index: number): string {
  return mode === 'calendar' ? (WEEKDAY_NAMES[index] ?? `Day ${index + 1}`) : `Day ${index + 1}`;
}

// True for names the app generated (so they may be relabelled); false for names the user typed.
export function isAutoDayName(name: string): boolean {
  return (WEEKDAY_NAMES as readonly string[]).includes(name) || /^Day \d{1,2}$/.test(name);
}

export function initialDays(
  mode: ScheduleMode,
  count: number,
): { dayNumber: number; sortOrder: number; weekday: number | null; dayName: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    dayNumber: index + 1,
    sortOrder: index + 1,
    weekday: mode === 'calendar' ? index : null,
    dayName: autoDayName(mode, index),
  }));
}

export function defaultCopyName(sourceName: string): string {
  const suffix = ' (copy)';
  return `${sourceName.slice(0, MAX_DAY_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`;
}

// Inserts a new item at the 1-based `position` and returns every item's new 1-based position.
export function positionsAfterInsert<T extends { id: string }>(
  ordered: readonly T[],
  newId: string,
  position: number,
): { id: string; position: number }[] {
  const ids = ordered.map((day) => day.id);
  ids.splice(position - 1, 0, newId);
  return ids.map((id, index) => ({ id, position: index + 1 }));
}
