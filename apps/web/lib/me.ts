import { AVATAR_COLORS, AVATAR_ICONS, DEFAULT_AVATAR_COLOR, DEFAULT_AVATAR_ICON, DEFAULT_PALETTE, THEME_PALETTES, type Me } from '@mesocycle/shared';
import type { User } from '@prisma/client';
import { prisma } from './db';

// Stored as text; anything unknown falls back to the default palette.
export function toPalette(value: string): Me['preferences']['palette'] {
  return (THEME_PALETTES as readonly string[]).includes(value) ? (value as Me['preferences']['palette']) : DEFAULT_PALETTE;
}

// Stored as text; anything unknown falls back to the default avatar.
export function toAvatar(icon: string, color: string): Me['avatar'] {
  return {
    icon: (AVATAR_ICONS as readonly string[]).includes(icon) ? (icon as Me['avatar']['icon']) : DEFAULT_AVATAR_ICON,
    color: (AVATAR_COLORS as readonly string[]).includes(color) ? (color as Me['avatar']['color']) : DEFAULT_AVATAR_COLOR,
  };
}

// Stored as text; anything unknown reads as pounds (the column's default).
export function toWeightUnit(value: string): Me['preferences']['weight_unit'] {
  return value === 'kg' ? 'kg' : 'lb';
}

const RESOLVED = ['completed', 'skipped'];

// The account panel: profile, preferences and a few totals across all of the user's mesocycles.
export async function loadMe(user: User): Promise<Me> {
  const mine = { week: { mesocycle: { userId: user.id } } };
  const finished = { ...mine, status: 'completed' };
  const [completed, skipped, loggedSets, unloggedSets, mesocyclesCompleted, mesocyclesTotal, active] = await Promise.all([
    prisma.workoutSession.count({ where: finished }),
    prisma.workoutSession.count({ where: { ...mine, status: 'skipped' } }),
    // Sets done: the logged sets of completed workouts, and the target sets of those finished without logging.
    prisma.loggedSet.count({ where: { sessionExercise: { session: finished } } }),
    prisma.sessionExercise.aggregate({
      where: { session: { ...finished, exercises: { none: { loggedSets: { some: {} } } } } },
      _sum: { targetSets: true },
    }),
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
    avatar: toAvatar(user.avatarIcon, user.avatarColor),
    sign_in: { password: user.passwordHash !== null, google: user.googleId !== null },
    preferences: { show_rir: user.showRir, palette: toPalette(user.palette), color_mode: user.colorMode === 'light' ? 'light' : 'dark', weight_unit: toWeightUnit(user.weightUnit) },
    stats: {
      workouts_completed: completed,
      workouts_skipped: skipped,
      sets_completed: loggedSets + (unloggedSets._sum.targetSets ?? 0),
      mesocycles_completed: mesocyclesCompleted,
      mesocycles_total: mesocyclesTotal,
      active: activeProgress,
    },
  };
}
