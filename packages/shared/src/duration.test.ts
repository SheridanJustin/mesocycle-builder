import { describe, expect, it } from 'vitest';
import { estimateSessionMinutes } from './duration';

describe('estimateSessionMinutes', () => {
  it('is just the warm-up (rounded) for an empty day', () => {
    expect(estimateSessionMinutes([])).toBe(5);
  });

  it('uses 195 s per compound set and 135 s per isolation set', () => {
    // 5 + 3 x 195 / 60 = 14.75 -> 15
    expect(estimateSessionMinutes([{ sets: 3, movementType: 'compound' }])).toBe(15);
    // 5 + 3 x 135 / 60 = 11.75 -> 10
    expect(estimateSessionMinutes([{ sets: 3, movementType: 'isolation' }])).toBe(10);
  });

  it('sums across slots and rounds to the nearest 5', () => {
    // 5 + (4 x 195 + 3 x 195 + 3 x 135) / 60 = 5 + 29.5 = 34.5 -> 35
    expect(
      estimateSessionMinutes([
        { sets: 4, movementType: 'compound' },
        { sets: 3, movementType: 'compound' },
        { sets: 3, movementType: 'isolation' },
      ]),
    ).toBe(35);
  });

  it('mixes movement types in one day', () => {
    // 5 + (195 + 135) / 60 = 10.5 -> 10
    expect(estimateSessionMinutes([{ sets: 1, movementType: 'compound' }, { sets: 1, movementType: 'isolation' }])).toBe(10);
  });
});
