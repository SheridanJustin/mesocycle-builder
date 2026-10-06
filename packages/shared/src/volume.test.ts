import { describe, expect, it } from 'vitest';
import { ValidateVolumeRequestSchema, VolumeSummarySchema } from './volume';

const exerciseId = 'e3b0c442-98fc-4c14-9afb-f4c8996fb924';

describe('ValidateVolumeRequestSchema', () => {
  it('defaults priorities and assigned_muscles', () => {
    const parsed = ValidateVolumeRequestSchema.parse({ slots: [{ exercise_id: exerciseId, target_sets: 3 }] });
    expect(parsed.priorities).toEqual([]);
    expect(parsed.assigned_muscles).toEqual([]);
  });

  it('rejects out-of-range sets and non-uuid exercise ids', () => {
    expect(ValidateVolumeRequestSchema.safeParse({ slots: [{ exercise_id: exerciseId, target_sets: 11 }] }).success).toBe(false);
    expect(ValidateVolumeRequestSchema.safeParse({ slots: [{ exercise_id: 'x', target_sets: 3 }] }).success).toBe(false);
  });
});

describe('VolumeSummarySchema', () => {
  it('accepts an empty summary and a partial muscle record', () => {
    expect(VolumeSummarySchema.safeParse({ summary: {} }).success).toBe(true);
    expect(
      VolumeSummarySchema.safeParse({
        summary: {
          chest: {
            total_sets: 14,
            exact_total_sets: 14,
            weekly_frequency: 2,
            status: 'MAV',
            landmarks: { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 },
            priority: 'focus',
            target_band: { low: 16, high: 20 },
            color: 'green',
            message: 'Within the productive range.',
          },
        },
      }).success,
    ).toBe(true);
  });
});
