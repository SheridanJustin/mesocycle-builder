import type { PutSchedule, ScheduleMode } from '@mesocycle/shared';
import { ApiRouteError } from './api';

type Detail = { path: string; issue: string };

// Rules that depend on the mesocycle's schedule_mode, which the request body does not carry.
export function weekdayIssues(schedule: PutSchedule, mode: ScheduleMode): Detail[] {
  const issues: Detail[] = [];
  const seen = new Set<number>();
  schedule.days.forEach((day, index) => {
    if (day.weekday === null) return;
    const path = `days[${index}].weekday`;
    if (mode === 'relative') {
      issues.push({ path, issue: 'Only allowed in calendar mode' });
    } else if (seen.has(day.weekday)) {
      issues.push({ path, issue: 'Weekdays must be unique' });
    }
    seen.add(day.weekday);
  });
  return issues;
}

export function unknownExerciseIssues(schedule: PutSchedule, knownIds: ReadonlySet<string>): Detail[] {
  const issues: Detail[] = [];
  schedule.days.forEach((day, dayIndex) => {
    day.slots.forEach((slot, slotIndex) => {
      if (!knownIds.has(slot.exercise_id)) {
        issues.push({ path: `days[${dayIndex}].slots[${slotIndex}].exercise_id`, issue: 'Exercise not found' });
      }
    });
  });
  return issues;
}

export function throwIfIssues(issues: Detail[]): void {
  if (issues.length > 0) throw new ApiRouteError('VALIDATION_ERROR', 'Request validation failed', issues);
}
