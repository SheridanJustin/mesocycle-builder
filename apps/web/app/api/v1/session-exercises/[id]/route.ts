import { ChangeSetsResultSchema, ChangeSetsSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { changeSets, loadWorkout } from '../../../../../lib/workouts';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// PATCH /api/v1/session-exercises/{id}: { op: 'add_set' } | { op: 'remove_set', set_number }.
// Returns the workout and the later weeks the change carried over to.
export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await parseJsonBody(request, ChangeSetsSchema);
    const { sessionId, carriedWeeks } = await changeSets(id, user.id, body);
    return jsonResponse(ChangeSetsResultSchema, { workout: await loadWorkout(sessionId, user), carried_weeks: carriedWeeks });
  });
}
