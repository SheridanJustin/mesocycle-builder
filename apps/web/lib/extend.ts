import { randomUUID } from 'node:crypto';
import { MAX_DURATION_WEEKS, sessionDate, type ExtendMesocycle } from '@mesocycle/shared';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { findOwnedMesocycle } from './mesocycles';

const EXTENDABLE = ['active', 'paused', 'completed'];

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

// POST /mesocycles/{id}/extend (SPEC decision 21): adds weeks to a locked mesocycle. New weeks copy
// the last training (non-deload) week's workouts, with any set changes, and keep the RIR ramp
// going (one less per week, never below 0). A deload week that has not started moves to the end;
// one already started stays where it is and the new weeks follow it. Extending a completed
// mesocycle reopens it (paused when another one is running).
export async function extendMesocycle(id: string, userId: string, body: ExtendMesocycle): Promise<void> {
  const mesocycle = await findOwnedMesocycle(id, userId);
  if (!EXTENDABLE.includes(mesocycle.status)) {
    throw new ApiRouteError('CONFLICT', `Only a locked mesocycle that is not dropped can be extended; this one is ${mesocycle.status}`);
  }
  const total = mesocycle.durationWeeks + body.weeks;
  if (total > MAX_DURATION_WEEKS) {
    throw new ApiRouteError('VALIDATION_ERROR', `A mesocycle lasts at most ${MAX_DURATION_WEEKS} weeks`, [
      { path: 'weeks', issue: `At most ${MAX_DURATION_WEEKS - mesocycle.durationWeeks} more` },
    ]);
  }

  const weeks = await prisma.mesocycleWeek.findMany({
    where: { mesocycleId: id },
    orderBy: { weekNumber: 'asc' },
    include: {
      sessions: { include: { day: { select: { weekday: true } }, exercises: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  const last = weeks[weeks.length - 1];
  if (!last) throw new ApiRouteError('CONFLICT', 'This mesocycle has no weeks');
  const deload = last.isDeload && last.sessions.every((s) => s.status === 'planned') ? last : null;
  const template = [...weeks].reverse().find((w) => !w.isDeload);
  if (!template) throw new ApiRouteError('CONFLICT', 'This mesocycle has no training week to copy');

  // New week numbers: after the training weeks (the untouched deload week moves behind them).
  const firstNew = deload ? deload.weekNumber : last.weekNumber + 1;
  const start = mesocycle.startDate ? mesocycle.startDate.toISOString().slice(0, 10) : null;
  const dateOf = (weekNumber: number, weekday: number | null) => (start ? toDate(sessionDate(start, weekNumber, weekday ?? 0)) : null);

  const newWeeks = Array.from({ length: body.weeks }, (_, i) => ({ id: randomUUID(), weekNumber: firstNew + i }));
  const sessions: { id: string; weekId: string; dayId: string; scheduledDate: Date | null; status: string }[] = [];
  const exercises: {
    sessionId: string;
    exerciseId: string;
    sortOrder: number;
    targetSets: number;
    repRangeMin: number;
    repRangeMax: number;
    targetRir: number;
    targetWeight: number | null;
  }[] = [];
  for (const week of newWeeks) {
    for (const session of template.sessions) {
      const sessionId = randomUUID();
      sessions.push({ id: sessionId, weekId: week.id, dayId: session.dayId, scheduledDate: dateOf(week.weekNumber, session.day.weekday), status: 'planned' });
      for (const item of session.exercises) {
        exercises.push({
          sessionId,
          exerciseId: item.exerciseId,
          sortOrder: item.sortOrder,
          targetSets: item.targetSets,
          repRangeMin: item.repRangeMin,
          repRangeMax: item.repRangeMax,
          targetRir: Math.max(0, item.targetRir - (week.weekNumber - template.weekNumber)),
          targetWeight: item.targetWeight === null ? null : item.targetWeight.toNumber(),
        });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (deload) {
      const moved = total;
      await tx.mesocycleWeek.update({ where: { id: deload.id }, data: { weekNumber: moved } });
      for (const session of deload.sessions) {
        await tx.workoutSession.update({ where: { id: session.id }, data: { scheduledDate: dateOf(moved, session.day.weekday) } });
      }
    }
    await tx.mesocycleWeek.createMany({ data: newWeeks.map((w) => ({ id: w.id, mesocycleId: id, weekNumber: w.weekNumber, isDeload: false })) });
    await tx.workoutSession.createMany({ data: sessions });
    await tx.sessionExercise.createMany({ data: exercises });

    // A completed mesocycle has new workouts again: it reopens (paused if another one is running).
    let status = mesocycle.status;
    if (status === 'completed') {
      const otherActive = await tx.mesocycle.count({ where: { userId, status: 'active', NOT: { id } } });
      status = otherActive > 0 ? 'paused' : 'active';
    }
    const updated = await tx.mesocycle.updateMany({
      where: { id, userId, status: mesocycle.status, durationWeeks: mesocycle.durationWeeks },
      data: {
        durationWeeks: total,
        status,
        // The deload is no longer the final week when it had already started.
        deloadFinalWeek: mesocycle.deloadFinalWeek && (deload !== null || !last.isDeload),
        endedAt: null,
      },
    });
    if (updated.count !== 1) throw new ApiRouteError('CONFLICT', 'The mesocycle changed meanwhile; reload and try again');
  });
}
