import type { UpdateSession } from '@mesocycle/shared';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { findOwnedMesocycle } from './mesocycles';
import { requireUuid } from './ids';

const RESOLVED = ['completed', 'skipped'];

// PATCH /sessions/{id}: marks a workout completed or skipped (or planned again, to undo). When
// every workout of the mesocycle is completed or skipped the mesocycle becomes `completed`;
// undoing one reopens it. Returns the mesocycle id.
export async function updateSessionStatus(sessionId: string, userId: string, body: UpdateSession): Promise<string> {
  requireUuid(sessionId, 'Workout');
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, week: { mesocycle: { userId } } },
    include: { week: { include: { mesocycle: true } } },
  });
  if (!session) throw new ApiRouteError('NOT_FOUND', 'Workout not found');
  const { mesocycle } = session.week;
  if (mesocycle.status !== 'active' && mesocycle.status !== 'completed') {
    throw new ApiRouteError('CONFLICT', `Workouts of a ${mesocycle.status} mesocycle cannot be changed`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.workoutSession.update({ where: { id: sessionId }, data: { status: body.status } });
    const open = await tx.workoutSession.count({
      where: { week: { mesocycleId: mesocycle.id }, status: { notIn: RESOLVED } },
    });
    const status = open === 0 ? 'completed' : 'active';
    if (status !== mesocycle.status) {
      await tx.mesocycle.update({
        where: { id: mesocycle.id },
        data: { status, endedAt: status === 'completed' ? new Date() : null },
      });
    }
  });
  return mesocycle.id;
}

// POST /mesocycles/{id}/drop: stops an active mesocycle early. It moves to the archive with its
// workouts as they are.
export async function dropMesocycle(id: string, userId: string): Promise<void> {
  const mesocycle = await findOwnedMesocycle(id, userId);
  if (mesocycle.status !== 'active') {
    throw new ApiRouteError('CONFLICT', `Only an active mesocycle can be dropped; this one is ${mesocycle.status}`);
  }
  const updated = await prisma.mesocycle.updateMany({
    where: { id, userId, status: 'active' },
    data: { status: 'dropped', endedAt: new Date() },
  });
  if (updated.count !== 1) throw new ApiRouteError('CONFLICT', 'Mesocycle is no longer active');
}
