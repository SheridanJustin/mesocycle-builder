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

const week = (weekdays: (number | null)[]) => schedule(weekdays.map((weekday) => ({ weekday })));

describe('weekdayIssues', () => {
  it('flags any weekday in relative mode', () => {
    expect(weekdayIssues(week([null, 2]), 'relative')).toEqual([
      { path: 'days[1].weekday', issue: 'Only allowed when days use weekday names' },
    ]);
    expect(weekdayIssues(week([null, null, null]), 'relative')).toEqual([]);
  });

  it('accepts a full Mon-Sun week in calendar mode', () => {
    expect(weekdayIssues(week([0, 1, 2, 3, 4, 5, 6]), 'calendar')).toEqual([]);
  });

  it('needs exactly 7 days in calendar mode', () => {
    expect(weekdayIssues(week([0, 1, 2]), 'calendar')).toEqual([{ path: 'days', issue: 'Weekday names need exactly 7 days' }]);
  });

  it('flags missing and duplicate weekdays in calendar mode', () => {
    expect(weekdayIssues(week([0, 1, 1, 3, null, 5, 6]), 'calendar')).toEqual([
      { path: 'days[2].weekday', issue: 'Weekdays must be unique' },
      { path: 'days[4].weekday', issue: 'Required when days use weekday names' },
    ]);
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
