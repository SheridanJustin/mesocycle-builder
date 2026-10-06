import { MAX_DAY_NAME_LENGTH } from '@mesocycle/shared';

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// "Day 1..N", or weekday names (Mon/Wed/Fri) when calendar weekdays were provided.
export function initialDays(
  daysPerWeek: number,
  weekdays: readonly number[] | undefined,
): { dayNumber: number; sortOrder: number; weekday: number | null; dayName: string }[] {
  const ordered = weekdays ? [...weekdays].sort((a, b) => a - b) : undefined;
  return Array.from({ length: daysPerWeek }, (_, index) => {
    const weekday = ordered?.[index] ?? null;
    return {
      dayNumber: index + 1,
      sortOrder: index + 1,
      weekday,
      dayName: weekday === null ? `Day ${index + 1}` : (WEEKDAY_NAMES[weekday] ?? `Day ${index + 1}`),
    };
  });
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
