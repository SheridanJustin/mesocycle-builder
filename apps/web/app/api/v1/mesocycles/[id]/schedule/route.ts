import { MesocycleDetailSchema, PutScheduleSchema } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../../lib/api';
import { getCurrentUser } from '../../../../../../lib/current-user';
import { prisma } from '../../../../../../lib/db';
import { findOwnedDraft, loadDetail } from '../../../../../../lib/mesocycles';
import { replaceSchedule } from '../../../../../../lib/save-schedule';
import { throwIfIssues, unknownExerciseIssues, weekdayIssues } from '../../../../../../lib/schedule-checks';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// PUT /api/v1/mesocycles/{id}/schedule: replace the entire schedule (idempotent; used by autosave).
export function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { id } = await params;
    const mesocycle = await findOwnedDraft(id, user.id);
    const schedule = await parseJsonBody(request, PutScheduleSchema);

    throwIfIssues(weekdayIssues(schedule, mesocycle.scheduleMode));

    // Slots may only use global exercises or the current user's own custom ones.
    const exerciseIds = [...new Set(schedule.days.flatMap((d) => d.slots.map((s) => s.exercise_id)))];
    const known = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    });
    throwIfIssues(unknownExerciseIssues(schedule, new Set(known.map((e) => e.id))));

    await replaceSchedule(id, schedule);
    return jsonResponse(MesocycleDetailSchema, await loadDetail(id, user.id));
  });
}
