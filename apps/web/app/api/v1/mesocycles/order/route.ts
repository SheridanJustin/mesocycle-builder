import { MesocycleListSchema, ReorderMesocyclesSchema } from '@mesocycle/shared';
import { ApiRouteError, handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { prisma } from '../../../../../lib/db';
import { toSummaryDto } from '../../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

// PUT /api/v1/mesocycles/order: saves the list order. The body lists every one of the user's
// mesocycle ids exactly once. Works for any status (reordering is not an edit of the plan).
export function PUT(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { ids } = await parseJsonBody(request, ReorderMesocyclesSchema);

    const owned = await prisma.mesocycle.findMany({ where: { userId: user.id }, select: { id: true } });
    const ownedIds = new Set(owned.map((row) => row.id));
    if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) {
      throw new ApiRouteError('VALIDATION_ERROR', 'ids must list each of your mesocycles exactly once', [
        { path: 'ids', issue: 'Must be a permutation of your mesocycle ids' },
      ]);
    }

    // Raw SQL so the reorder does not bump updated_at ("Edited" dates stay meaningful).
    await prisma.$executeRaw`
      UPDATE "mesocycles" AS m
      SET "position" = (o.pos - 1)::INTEGER
      FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS o(id, pos)
      WHERE m."id" = o.id AND m."user_id" = ${user.id}::uuid`;

    const rows = await prisma.mesocycle.findMany({
      where: { userId: user.id },
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      include: { _count: { select: { days: true } } },
    });
    return jsonResponse(MesocycleListSchema, { items: rows.map(toSummaryDto) });
  });
}
