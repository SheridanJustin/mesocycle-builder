import { describe, expect, it } from 'vitest';
import { defaultCopyName, initialDays, positionsAfterInsert } from './days';

describe('initialDays', () => {
  it('names days "Day 1..N" in relative mode', () => {
    const days = initialDays(3, undefined);
    expect(days.map((d) => d.dayName)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(days.map((d) => d.sortOrder)).toEqual([1, 2, 3]);
    expect(days.every((d) => d.weekday === null)).toBe(true);
  });

  it('uses sorted weekday names in calendar mode', () => {
    const days = initialDays(3, [4, 0, 2]);
    expect(days.map((d) => [d.dayName, d.weekday])).toEqual([
      ['Mon', 0],
      ['Wed', 2],
      ['Fri', 4],
    ]);
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
