import { ValidateVolumeRequestSchema, VolumeSummarySchema, type Muscle } from '@mesocycle/shared';
import { handle, jsonResponse, parseJsonBody } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { prisma } from '../../../../../lib/db';
import { throwIfIssues } from '../../../../../lib/schedule-checks';
import { summarizeVolume } from '../../../../../lib/volume';

export const dynamic = 'force-dynamic';

// POST /api/v1/mesocycles/validate-volume: stateless; same engine and result as the client.
export function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const body = await parseJsonBody(request, ValidateVolumeRequestSchema);

    const ids = [...new Set(body.slots.map((s) => s.exercise_id))];
    const rows = await prisma.exercise.findMany({
      where: { id: { in: ids }, OR: [{ userId: null }, { userId: user.id }] },
    });
    const exercises = new Map(rows.map((row) => [row.id, row]));
    throwIfIssues(
      body.slots.flatMap((slot, index) =>
        exercises.has(slot.exercise_id) ? [] : [{ path: `slots[${index}].exercise_id`, issue: 'Exercise not found' }],
      ),
    );

    const summary = await summarizeVolume({
      slots: body.slots.map((s) => ({ exerciseId: s.exercise_id, sets: s.target_sets, dayId: s.day_id })),
      exercises: Object.fromEntries(
        rows.map((row) => [row.id, { id: row.id, primary: row.primaryMuscle, secondary: row.secondaryMuscles as Muscle[] }]),
      ),
      priorities: body.priorities,
      assignedMuscles: body.assigned_muscles,
    });
    return jsonResponse(VolumeSummarySchema, summary);
  });
}
