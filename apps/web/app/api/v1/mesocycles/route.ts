import { CreateMesocycleSchema, MesocycleDetailSchema, MesocycleListSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { prisma } from '../../../../lib/db';
import { initialDays } from '../../../../lib/days';
import { loadDetail, toSummaryDto } from '../../../../lib/mesocycles';

export const dynamic = 'force-dynamic';

// GET /api/v1/mesocycles: the current user's mesocycles in their own order (summary only).
export function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    const rows = await prisma.mesocycle.findMany({
      where: { userId: user.id },
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      include: { _count: { select: { days: true } } },
    });
    return jsonResponse(MesocycleListSchema, { items: rows.map(toSummaryDto) });
  });
}

// POST /api/v1/mesocycles: create a draft with `days_per_week` empty days (Mon-Sun by default).
export function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const body = await parseJsonBody(request, CreateMesocycleSchema);
    // A new mesocycle goes to the top of the user's list.
    const first = await prisma.mesocycle.aggregate({ where: { userId: user.id }, _min: { position: true } });

    const created = await prisma.mesocycle.create({
      data: {
        userId: user.id,
        name: body.name,
        durationWeeks: body.duration_weeks,
        daysPerWeek: body.days_per_week,
        scheduleMode: body.schedule_mode,
        position: (first._min.position ?? 1) - 1,
        days: {
          create: initialDays(body.schedule_mode, body.days_per_week).map((day) => ({
            dayNumber: day.dayNumber,
            weekday: day.weekday,
            dayName: day.dayName,
            sortOrder: day.sortOrder,
          })),
        },
      },
    });
    return jsonResponse(MesocycleDetailSchema, await loadDetail(created.id, user.id), 201);
  });
}
