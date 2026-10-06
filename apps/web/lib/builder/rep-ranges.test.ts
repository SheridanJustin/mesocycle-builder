import { describe, expect, it } from 'vitest';
import { matchingPreset, parseWeight, presetLabel, repRangeError } from './rep-ranges';

describe('rep presets', () => {
  it('matches the default 8-12 and the spec presets', () => {
    expect(matchingPreset(8, 12)).toEqual({ min: 8, max: 12 });
    expect(matchingPreset(5, 10)).toEqual({ min: 5, max: 10 });
    expect(matchingPreset(20, 30)).toEqual({ min: 20, max: 30 });
  });

  it('returns null for a custom range', () => {
    expect(matchingPreset(6, 12)).toBeNull();
  });

  it('labels with an en dash', () => {
    expect(presetLabel({ min: 10, max: 15 })).toBe('10–15');
  });
});

describe('repRangeError', () => {
  it.each([
    [8, 12, null],
    [1, 2, null],
    [49, 50, null],
    [0, 10, 'Minimum is 1'],
    [5, 51, 'Maximum is 50'],
    [10, 10, 'Min must be below max'],
    [12, 8, 'Min must be below max'],
    [5.5, 10, 'Reps must be whole numbers'],
  ])('%s-%s -> %s', (min, max, expected) => {
    expect(repRangeError(min, max)).toBe(expected);
  });
});

describe('parseWeight', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['0', 0],
    ['185', 185],
    ['185.5', 185.5],
    ['185.25', 185.25],
    ['9999.99', 9999.99],
  ])('accepts %j', (text, value) => {
    expect(parseWeight(text)).toEqual({ ok: true, value });
  });

  it.each(['abc', '-5', '185.123', '10000', '1e3', '.5'])('rejects %j', (text) => {
    expect(parseWeight(text).ok).toBe(false);
  });
});
