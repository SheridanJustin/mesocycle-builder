import { PutScheduleSchema } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { throwIfIssues, unknownExerciseIssues, weekdayIssues } from './schedule-checks';

const exerciseId = 'e3b0c442-98fc-4c14-9afb-f4c8996fb924';

function schedule(days: { weekday: number | null }[]) {
  return PutScheduleSchema.parse({
    days: days.map((d, i) => ({
      day_number: i + 1,
      weekday: d.weekday,
      day_name: `Day ${i + 1}`,
      sort_order: i + 1,
      muscle_groups: [{ muscle: 'chest', sort_order: 1 }],
      slots: [{ client_id: 'a', muscle: 'chest', exercise_id: exerciseId, sort_order: 1 }],
    })),
  });
}

describe('weekdayIssues', () => {
  it('flags any weekday in relative mode', () => {
    expect(weekdayIssues(schedule([{ weekday: null }, { weekday: 2 }]), 'relative')).toEqual([
      { path: 'days[1].weekday', issue: 'Only allowed in calendar mode' },
    ]);
  });

  it('flags duplicate weekdays in calendar mode and allows nulls', () => {
    expect(weekdayIssues(schedule([{ weekday: 1 }, { weekday: null }, { weekday: 1 }]), 'calendar')).toEqual([
      { path: 'days[2].weekday', issue: 'Weekdays must be unique' },
    ]);
    expect(weekdayIssues(schedule([{ weekday: 0 }, { weekday: 3 }]), 'calendar')).toEqual([]);
  });
});

describe('unknownExerciseIssues', () => {
  it('reports slots whose exercise is not known', () => {
    const s = schedule([{ weekday: null }]);
    expect(unknownExerciseIssues(s, new Set())).toEqual([
      { path: 'days[0].slots[0].exercise_id', issue: 'Exercise not found' },
    ]);
    expect(unknownExerciseIssues(s, new Set([exerciseId]))).toEqual([]);
  });
});

describe('throwIfIssues', () => {
  it('throws a VALIDATION_ERROR only when there are issues', () => {
    expect(() => throwIfIssues([])).not.toThrow();
    expect(() => throwIfIssues([{ path: 'x', issue: 'bad' }])).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });
});
