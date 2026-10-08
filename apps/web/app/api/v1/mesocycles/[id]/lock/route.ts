import { LockMesocycleSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { lockMesocycle } from '../../../../../../lib/lock-in';
import { loadDetail } from '../../../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/mesocycles/{id}/lock: freeze a draft and generate its workouts (SPEC 9).
export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await parseJsonBody(request, LockMesocycleSchema);
    await lockMesocycle(id, user.id, body);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
