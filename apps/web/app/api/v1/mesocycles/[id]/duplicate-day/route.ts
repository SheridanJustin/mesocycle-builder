import { DuplicateDaySchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { duplicateDay } from '../../../../../../lib/duplicate-day';
import { findOwnedDraft, loadDetail } from '../../../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// POST /api/v1/mesocycles/{id}/duplicate-day: deep-copy a day to target_position.
export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    await findOwnedDraft(id, user.id);
    const body = await parseJsonBody(request, DuplicateDaySchema);

    await duplicateDay({
      mesocycleId: id,
      sourceDayId: body.source_day_id,
      targetPosition: body.target_position,
      newName: body.new_name,
    });
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
