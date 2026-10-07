import { MesocycleDetailSchema, PatchMesocycleSchema } from '@mesocycle/shared';
import { NextResponse } from 'next/server';
import { ApiRouteError, handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { prisma } from '../../../../../lib/db';
import { findOwnedDraft, findOwnedMesocycle, loadDetail } from '../../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/mesocycles/{id}: full mesocycle plus the computed volume_summary.
export function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}

// PATCH /api/v1/mesocycles/{id}: name, duration_weeks, deload_final_week. Drafts only.
export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    await findOwnedDraft(id, user.id);
    const body = await parseJsonBody(request, PatchMesocycleSchema);

    await prisma.mesocycle.update({
      where: { id },
      data: {
        name: body.name,
        durationWeeks: body.duration_weeks,
        deloadFinalWeek: body.deload_final_week,
      },
    });
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}

// DELETE /api/v1/mesocycles/{id}: drafts and archived (completed or dropped) mesocycles; everything
// cascades. An active one must be dropped first.
export function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const mesocycle = await findOwnedMesocycle(id, user.id);
    if (mesocycle.status === 'active' || mesocycle.status === 'paused') {
      throw new ApiRouteError('CONFLICT', `An ${mesocycle.status} mesocycle cannot be deleted; drop it first`);
    }
    await prisma.mesocycle.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  });
}
