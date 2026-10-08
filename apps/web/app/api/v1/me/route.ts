import { MeSchema, UpdateMeSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { prisma } from '../../../../lib/db';
import { loadMe } from '../../../../lib/me';

export const dynamic = 'force-dynamic';

// GET /api/v1/me: the signed-in user's profile, preferences and training stats.
export function GET() {
  return handle(async () => jsonResponse(MeSchema, await loadMe(await getCurrentUser())));
}

// PATCH /api/v1/me: { show_rir?, palette?, color_mode?, weight_unit?, name? }.
export function PATCH(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const body = await parseJsonBody(request, UpdateMeSchema);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        showRir: body.show_rir,
        palette: body.palette,
        colorMode: body.color_mode,
        weightUnit: body.weight_unit,
        ...(body.name !== undefined ? { name: body.name } : {}),
      },
    });
    return jsonResponse(MeSchema, await loadMe(updated));
  });
}
