import { describe, expect, it } from 'vitest';
import { LandmarksSchema, MuscleLandmarkSchema } from './landmarks';

const chest = { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 };

describe('LandmarksSchema', () => {
  it('accepts ordered landmarks, including equal neighbours', () => {
    expect(LandmarksSchema.safeParse(chest).success).toBe(true);
    expect(LandmarksSchema.safeParse({ mv: 0, mev: 0, mav_low: 4, mav_high: 12, mrv: 16 }).success).toBe(true);
  });

  it('rejects out-of-order landmarks', () => {
    expect(LandmarksSchema.safeParse({ ...chest, mev: 7 }).success).toBe(false);
    expect(LandmarksSchema.safeParse({ ...chest, mrv: 19 }).success).toBe(false);
  });

  it('validates a muscle landmark row', () => {
    expect(MuscleLandmarkSchema.safeParse({ muscle: 'chest', ...chest }).success).toBe(true);
    expect(MuscleLandmarkSchema.safeParse({ muscle: 'neck', ...chest }).success).toBe(false);
  });
});
