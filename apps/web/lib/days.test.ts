import { describe, expect, it } from 'vitest';
import { autoDayName, defaultCopyName, initialDays, isAutoDayName, positionsAfterInsert } from './days';

describe('initialDays', () => {
  it('creates Mon-Sun with weekdays 0-6 in calendar mode', () => {
    const days = initialDays('calendar', 7);
    expect(days.map((d) => d.dayName)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(days.map((d) => d.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('numbers days without weekdays in relative mode', () => {
    const days = initialDays('relative', 3);
    expect(days.map((d) => d.dayName)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(days.every((d) => d.weekday === null)).toBe(true);
  });
});

describe('autoDayName / isAutoDayName', () => {
  it('names by mode and position', () => {
    expect(autoDayName('calendar', 0)).toBe('Mon');
    expect(autoDayName('calendar', 6)).toBe('Sun');
    expect(autoDayName('relative', 0)).toBe('Day 1');
    expect(autoDayName('relative', 9)).toBe('Day 10');
  });

  it('recognises generated names only', () => {
    for (const name of ['Mon', 'Sun', 'Day 1', 'Day 10']) expect(isAutoDayName(name)).toBe(true);
    for (const name of ['Push A', 'Monday', 'Day', 'Day 100', 'day 1']) expect(isAutoDayName(name)).toBe(false);
  });
});

describe('defaultCopyName', () => {
  it('appends (copy)', () => {
    expect(defaultCopyName('Push A')).toBe('Push A (copy)');
  });

  it('never exceeds 50 characters', () => {
    expect(defaultCopyName('x'.repeat(50))).toHaveLength(50);
    expect(defaultCopyName('x'.repeat(50)).endsWith(' (copy)')).toBe(true);
  });
});

describe('positionsAfterInsert', () => {
  const days = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('inserts in the middle and shifts later items', () => {
    expect(positionsAfterInsert(days, 'new', 2)).toEqual([
      { id: 'a', position: 1 },
      { id: 'new', position: 2 },
      { id: 'b', position: 3 },
      { id: 'c', position: 4 },
    ]);
  });

  it('inserts at the front and at the end', () => {
    expect(positionsAfterInsert(days, 'new', 1)[0]).toEqual({ id: 'new', position: 1 });
    expect(positionsAfterInsert(days, 'new', 4)[3]).toEqual({ id: 'new', position: 4 });
  });
});
