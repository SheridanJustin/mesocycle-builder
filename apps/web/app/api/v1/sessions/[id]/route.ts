import { MesocycleDetailSchema, UpdateSessionSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { loadDetail } from '../../../../../lib/mesocycles';
import { updateSessionStatus } from '../../../../../lib/tracking';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// PATCH /api/v1/sessions/{id}: { status: completed | skipped | planned }. Returns the whole mesocycle,
// because finishing the last workout also completes the mesocycle.
export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await parseJsonBody(request, UpdateSessionSchema);
    const mesocycleId = await updateSessionStatus(id, user.id, body);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(mesocycleId, user.id));
  });
}
