import { MesocycleDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { loadDetail } from '../../../../../../lib/mesocycles';
import { resumeMesocycle } from '../../../../../../lib/tracking';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/mesocycles/{id}/resume: continue a paused mesocycle (the active one, if any, is paused).
export function POST(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    await resumeMesocycle(id, user.id);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
