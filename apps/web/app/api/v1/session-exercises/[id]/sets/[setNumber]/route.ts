import { LogSetSchema, SetNumberSchema, WorkoutDetailSchema } from '@mesocycle/shared';
import { ApiRouteError, handle, jsonResponse, parseJsonBody } from '../../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../../lib/current-user';
import { deleteSet, loadWorkout, logSet } from '../../../../../../../lib/workouts';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; setNumber: string }> };

function parseSetNumber(value: string): number {
  const parsed = SetNumberSchema.safeParse(value);
  if (!parsed.success) throw new ApiRouteError('VALIDATION_ERROR', 'Set number must be between 1 and 20', [{ path: 'set_number', issue: 'Out of range' }]);
  return parsed.data;
}

// PUT /api/v1/session-exercises/{id}/sets/{n}: { weight, reps }. Logs or corrects one set and returns
// the whole workout (its personal-record badges may move).
export function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id, setNumber } = await params;
    const n = parseSetNumber(setNumber);
    const body = await parseJsonBody(request, LogSetSchema);
    const sessionId = await logSet(id, n, user.id, body);
    return jsonResponse(WorkoutDetailSchema, await loadWorkout(sessionId, user));
  });
}

// DELETE /api/v1/session-exercises/{id}/sets/{n}: un-logs a set and returns the whole workout.
export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id, setNumber } = await params;
    const sessionId = await deleteSet(id, parseSetNumber(setNumber), user.id);
    return jsonResponse(WorkoutDetailSchema, await loadWorkout(sessionId, user));
  });
}
