import { describe, expect, it } from 'vitest';
import { formatIsoDate, todayIso } from './dates';

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 9, 23, 30))).toBe('2026-01-09');
  });

  it('formats calendar dates without shifting the day', () => {
    expect(formatIsoDate('2026-10-05')).toBe('Mon, Oct 5, 2026');
    expect(formatIsoDate('2026-11-01', 'short')).toBe('Sun, Nov 1');
  });
});
