import { ExtendMesocycleSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { extendMesocycle } from '../../../../../../lib/extend';
import { loadDetail } from '../../../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/mesocycles/{id}/extend: { weeks } more weeks for a locked mesocycle.
export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await parseJsonBody(request, ExtendMesocycleSchema);
    await extendMesocycle(id, user.id, body);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
