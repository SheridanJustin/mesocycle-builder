import type { Me } from '@mesocycle/shared';
import type { User } from '@prisma/client';
import { prisma } from './db';

const RESOLVED = ['completed', 'skipped'];

// The account panel: profile, preferences and a few totals across all of the user's mesocycles.
export async function loadMe(user: User): Promise<Me> {
  const mine = { week: { mesocycle: { userId: user.id } } };
  const [completed, skipped, sets, mesocyclesCompleted, mesocyclesTotal, active] = await Promise.all([
    prisma.workoutSession.count({ where: { ...mine, status: 'completed' } }),
    prisma.workoutSession.count({ where: { ...mine, status: 'skipped' } }),
    prisma.sessionExercise.aggregate({ where: { session: { ...mine, status: 'completed' } }, _sum: { targetSets: true } }),
    prisma.mesocycle.count({ where: { userId: user.id, status: 'completed' } }),
    prisma.mesocycle.count({ where: { userId: user.id } }),
    prisma.mesocycle.findFirst({ where: { userId: user.id, status: 'active' }, orderBy: { lockedAt: 'desc' }, select: { id: true, name: true } }),
  ]);

  let activeProgress: Me['stats']['active'] = null;
  if (active) {
    const scope = { week: { mesocycleId: active.id } };
    const [done, total] = await Promise.all([
      prisma.workoutSession.count({ where: { ...scope, status: { in: RESOLVED } } }),
      prisma.workoutSession.count({ where: scope }),
    ]);
    activeProgress = { ...active, done, total };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.createdAt.toISOString(),
    sign_in: { password: user.passwordHash !== null, google: user.googleId !== null },
    preferences: { show_rir: user.showRir },
    stats: {
      workouts_completed: completed,
      workouts_skipped: skipped,
      sets_completed: sets._sum.targetSets ?? 0,
      mesocycles_completed: mesocyclesCompleted,
      mesocycles_total: mesocyclesTotal,
      active: activeProgress,
    },
  };
}
