import { z } from 'zod';
import { MAX_SETS, MIN_SETS } from './constants';
import { MuscleSchema, PrioritySchema, VolumeColorSchema, VolumeStatusSchema } from './enums';
import { LandmarksSchema } from './landmarks';

export const MuscleVolumeSchema = z.object({
  // Rounded to the nearest 0.5 for display.
  total_sets: z.number().min(0),
  // Full precision; status is always computed from this value.
  exact_total_sets: z.number().min(0),
  weekly_frequency: z.number().int().min(0),
  status: VolumeStatusSchema,
  landmarks: LandmarksSchema,
  priority: PrioritySchema,
  target_band: z.object({ low: z.number(), high: z.number() }),
  color: VolumeColorSchema,
  message: z.string(),
});
export type MuscleVolume = z.infer<typeof MuscleVolumeSchema>;

export const VolumeSummarySchema = z.object({
  summary: z.record(MuscleSchema, MuscleVolumeSchema),
});
export type VolumeSummary = z.infer<typeof VolumeSummarySchema>;

export const PriorityEntrySchema = z.object({ muscle: MuscleSchema, priority: PrioritySchema });
export type PriorityEntry = z.infer<typeof PriorityEntrySchema>;

export const ValidateVolumeRequestSchema = z.object({
  slots: z.array(
    z.object({
      exercise_id: z.string().uuid(),
      target_sets: z.number().int().min(MIN_SETS).max(MAX_SETS),
      // Needed for weekly_frequency. Slots without a day_id share one anonymous day.
      day_id: z.string().min(1).optional(),
    }),
  ),
  priorities: z.array(PriorityEntrySchema).default([]),
  // Muscles assigned to a day; they appear in the summary even with zero sets.
  assigned_muscles: z.array(MuscleSchema).default([]),
});
export type ValidateVolumeRequest = z.infer<typeof ValidateVolumeRequestSchema>;
