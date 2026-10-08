import { WorkoutDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { loadWorkout } from '../../../../../../lib/workouts';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/sessions/{id}/workout: the workout logger's data (logged sets, previous numbers, bests).
export function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    return jsonResponse(WorkoutDetailSchema, await loadWorkout(id, user));
  });
}
