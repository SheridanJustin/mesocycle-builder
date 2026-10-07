import { MesocycleDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { loadDetail } from '../../../../../../lib/mesocycles';
import { dropMesocycle } from '../../../../../../lib/tracking';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/mesocycles/{id}/drop: stop an active mesocycle early (it moves to the archive).
export function POST(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    await dropMesocycle(id, user.id);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
