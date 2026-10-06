import type { Exercise as ExerciseRow } from '@prisma/client';
import type { Exercise } from '@mesocycle/shared';
import { ApiRouteError } from './api';

export function toExerciseDto(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    primary_muscle: row.primaryMuscle,
    secondary_muscles: row.secondaryMuscles,
    equipment_type: row.equipmentType,
    movement_type: row.movementType,
    is_custom: row.isCustom,
  };
}

// Cursor = last item's (name, id), matching the list ordering.
export type ExerciseCursor = { name: string; id: string };

export function encodeCursor(cursor: ExerciseCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(value: string): ExerciseCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as ExerciseCursor).name === 'string' &&
      typeof (parsed as ExerciseCursor).id === 'string'
    ) {
      const { name, id } = parsed as ExerciseCursor;
      return { name, id };
    }
  } catch {
    // fall through
  }
  throw new ApiRouteError('VALIDATION_ERROR', 'Invalid cursor', [{ path: 'cursor', issue: 'Invalid cursor' }]);
}
