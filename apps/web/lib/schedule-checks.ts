import { WEEK_DAYS, type PutSchedule, type ScheduleMode } from '@mesocycle/shared';
import { ApiRouteError } from './api';

type Detail = { path: string; issue: string };

// Rules that depend on the schedule mode. Calendar mode is a Mon-Sun week: exactly 7 days, each with
// its own weekday. Numbered (relative) days carry no weekday.
export function weekdayIssues(schedule: PutSchedule, mode: ScheduleMode): Detail[] {
  const issues: Detail[] = [];
  if (mode === 'calendar' && schedule.days.length !== WEEK_DAYS) {
    issues.push({ path: 'days', issue: `Weekday names need exactly ${WEEK_DAYS} days` });
  }
  const seen = new Set<number>();
  schedule.days.forEach((day, index) => {
    const path = `days[${index}].weekday`;
    if (mode === 'relative') {
      if (day.weekday !== null) issues.push({ path, issue: 'Only allowed when days use weekday names' });
      return;
    }
    if (day.weekday === null) issues.push({ path, issue: 'Required when days use weekday names' });
    else if (seen.has(day.weekday)) issues.push({ path, issue: 'Weekdays must be unique' });
    else seen.add(day.weekday);
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
