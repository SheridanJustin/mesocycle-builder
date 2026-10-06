import { describe, expect, it } from 'vitest';
import { CreateExerciseSchema, ListExercisesQuerySchema } from './exercise';

const valid = {
  name: 'Cable Fly',
  primary_muscle: 'chest',
  equipment_type: 'cable',
  movement_type: 'isolation',
} as const;

describe('CreateExerciseSchema', () => {
  it('defaults secondary_muscles to an empty list', () => {
    expect(CreateExerciseSchema.parse(valid).secondary_muscles).toEqual([]);
  });

  it('rejects the primary muscle as a secondary muscle', () => {
    expect(CreateExerciseSchema.safeParse({ ...valid, secondary_muscles: ['chest'] }).success).toBe(false);
  });

  it('rejects duplicate secondary muscles', () => {
    expect(CreateExerciseSchema.safeParse({ ...valid, secondary_muscles: ['triceps', 'triceps'] }).success).toBe(false);
  });

  it('rejects blank names and unknown enum values', () => {
    expect(CreateExerciseSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(CreateExerciseSchema.safeParse({ ...valid, equipment_type: 'kettlebell' }).success).toBe(false);
  });
});

describe('ListExercisesQuerySchema', () => {
  it('defaults limit to 50 and coerces string input', () => {
    expect(ListExercisesQuerySchema.parse({}).limit).toBe(50);
    expect(ListExercisesQuerySchema.parse({ limit: '25' }).limit).toBe(25);
  });

  it('caps limit at 200', () => {
    expect(ListExercisesQuerySchema.safeParse({ limit: '201' }).success).toBe(false);
    expect(ListExercisesQuerySchema.safeParse({ limit: '200' }).success).toBe(true);
  });
});
