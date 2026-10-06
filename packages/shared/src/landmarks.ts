import { z } from 'zod';
import { MuscleSchema } from './enums';

const sets = z.number().int().min(0);

export const LandmarksSchema = z
  .object({ mv: sets, mev: sets, mav_low: sets, mav_high: sets, mrv: sets })
  .refine((l) => l.mv <= l.mev && l.mev <= l.mav_low && l.mav_low <= l.mav_high && l.mav_high <= l.mrv, {
    message: 'Landmarks must satisfy mv <= mev <= mav_low <= mav_high <= mrv',
  });
export type LandmarksValue = z.infer<typeof LandmarksSchema>;

export const MuscleLandmarkSchema = z.object({ muscle: MuscleSchema }).and(LandmarksSchema);
export type MuscleLandmark = z.infer<typeof MuscleLandmarkSchema>;

export const MuscleLandmarkListSchema = z.object({ items: z.array(MuscleLandmarkSchema) });
export type MuscleLandmarkList = z.infer<typeof MuscleLandmarkListSchema>;
