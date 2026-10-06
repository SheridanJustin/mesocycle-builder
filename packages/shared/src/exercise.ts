import { z } from 'zod';
import { DEFAULT_EXERCISE_PAGE_SIZE, MAX_EXERCISE_PAGE_SIZE } from './constants';
import { EquipmentSchema, MovementTypeSchema, MuscleSchema } from './enums';

const exerciseName = z.string().trim().min(1).max(255);

export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: exerciseName,
  primary_muscle: MuscleSchema,
  secondary_muscles: z.array(MuscleSchema),
  equipment_type: EquipmentSchema,
  movement_type: MovementTypeSchema,
  is_custom: z.boolean(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const CreateExerciseSchema = z
  .object({
    name: exerciseName,
    primary_muscle: MuscleSchema,
    secondary_muscles: z.array(MuscleSchema).default([]),
    equipment_type: EquipmentSchema,
    movement_type: MovementTypeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.secondary_muscles.includes(value.primary_muscle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secondary_muscles'],
        message: 'Must not include the primary muscle',
      });
    }
    if (new Set(value.secondary_muscles).size !== value.secondary_muscles.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['secondary_muscles'], message: 'Must not contain duplicates' });
    }
  });
export type CreateExercise = z.infer<typeof CreateExerciseSchema>;

export const ListExercisesQuerySchema = z.object({
  primary_muscle: MuscleSchema.optional(),
  equipment: EquipmentSchema.optional(),
  movement_type: MovementTypeSchema.optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_EXERCISE_PAGE_SIZE).default(DEFAULT_EXERCISE_PAGE_SIZE),
  cursor: z.string().min(1).optional(),
});
export type ListExercisesQuery = z.infer<typeof ListExercisesQuerySchema>;

export const ExerciseListSchema = z.object({
  items: z.array(ExerciseSchema),
  next_cursor: z.string().nullable(),
});
export type ExerciseList = z.infer<typeof ExerciseListSchema>;
