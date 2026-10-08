import { randomUUID } from 'node:crypto';
import { isMonday, planWeeks, RirRampStrategy, sessionDate, type LockMesocycle, type ProgressionStrategy } from '@mesocycle/shared';
import { lockWarnings } from '@mesocycle/volume-engine';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { groupLabel, STATUS_LABEL } from './labels';
import { findOwnedDraft } from './mesocycles';
import { summarizeGroupVolume } from './volume';

// Test seam: lets an integration test fail the transaction halfway to prove it rolls back.
export type LockHooks = { afterWeeksCreated?: () => Promise<void> | void };

const SCHEDULE_INCLUDE = {
  days: {
    orderBy: { sortOrder: 'asc' },
    include: { muscleGroups: { include: { slots: { include: { exercise: true } } } } },
  },
} as const;

// POST /mesocycles/{id}/lock (SPEC 6.2, 9): validates, then in one transaction marks the
// mesocycle active and generates its weeks, workouts and per-workout exercise targets.
export async function lockMesocycle(
  id: string,
  userId: string,
  body: LockMesocycle,
  opts: { strategy?: ProgressionStrategy; hooks?: LockHooks } = {},
): Promise<void> {
  const strategy = opts.strategy ?? RirRampStrategy;
  const draft = await findOwnedDraft(id, userId);
  const row = await prisma.mesocycle.findUniqueOrThrow({ where: { id }, include: SCHEDULE_INCLUDE });

  // A day's slots in the order the user arranged them (sort_order is per day, SPEC 5.2).
  const days = row.days.map((day) => ({
    day,
    slots: day.muscleGroups.flatMap((group) => group.slots).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  const trainingDays = days.filter((d) => d.slots.length > 0);
  if (trainingDays.length === 0) {
    throw new ApiRouteError('VALIDATION_ERROR', 'Add at least one exercise before locking in', [
      { path: 'days', issue: 'At least one day needs an exercise' },
    ]);
  }

  const calendar = draft.scheduleMode === 'calendar';
  if (calendar && !body.start_date) {
    throw new ApiRouteError('VALIDATION_ERROR', 'Choose the Monday your first week starts', [
      { path: 'start_date', issue: 'Required for a Mon-Sun mesocycle' },
    ]);
  }
  if (calendar && body.start_date && !isMonday(body.start_date)) {
    throw new ApiRouteError('VALIDATION_ERROR', 'A Mon-Sun mesocycle must start on a Monday', [
      { path: 'start_date', issue: 'Must be a Monday' },
    ]);
  }

  const slotRows = trainingDays.flatMap(({ day, slots }) => slots.map((slot) => ({ day, slot })));
  const volume = await summarizeGroupVolume(
    slotRows.map(({ day, slot }) => ({ exerciseId: slot.exerciseId, sets: slot.targetSets, dayId: day.id })),
    Object.fromEntries(
      slotRows.map(({ slot }) => [
        slot.exerciseId,
        { id: slot.exerciseId, primary: slot.exercise.primaryMuscle, secondary: slot.exercise.secondaryMuscles },
      ]),
    ),
  );
  const warnings = lockWarnings(volume);
  if (warnings.length > 0 && !body.acknowledge_warnings) {
    throw new ApiRouteError(
      'VALIDATION_ERROR',
      'Some muscle groups are outside their recommended range; set acknowledge_warnings to lock in anyway',
      warnings.map((w) => ({ path: 'acknowledge_warnings', issue: `${groupLabel(w.group)}: ${STATUS_LABEL[w.status]} (${w.totalSets} set${w.totalSets === 1 ? '' : 's'})` })),
    );
  }

  // Build every row up front (ids generated here) so the transaction is three bulk inserts.
  const weeks = planWeeks(draft.durationWeeks, draft.deloadFinalWeek).map((plan) => ({ ...plan, id: randomUUID() }));
  const sessions: { id: string; weekId: string; dayId: string; scheduledDate: Date | null }[] = [];
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
  for (const week of weeks) {
    for (const { day, slots } of trainingDays) {
      const sessionId = randomUUID();
      const date = calendar && body.start_date ? sessionDate(body.start_date, week.weekNumber, day.weekday ?? 0) : null;
      sessions.push({ id: sessionId, weekId: week.id, dayId: day.id, scheduledDate: date ? new Date(`${date}T00:00:00Z`) : null });
      slots.forEach((slot, index) => {
        const targets = strategy.apply(
          {
            sets: slot.targetSets,
            repMin: slot.repRangeMin,
            repMax: slot.repRangeMax,
            rir: slot.targetRir,
            weight: slot.startingWeight === null ? null : slot.startingWeight.toNumber(),
          },
          week.weekNumber,
          weeks.length,
          week.isDeload,
        );
        exercises.push({
          sessionId,
          exerciseId: slot.exerciseId,
          sortOrder: index + 1,
          targetSets: targets.sets,
          repRangeMin: targets.repMin,
          repRangeMax: targets.repMax,
          targetRir: targets.rir,
          targetWeight: targets.weight,
        });
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Only one mesocycle runs at a time: the one in progress is paused (it can be resumed later).
    await tx.mesocycle.updateMany({ where: { userId, status: 'active', NOT: { id } }, data: { status: 'paused' } });
    // Re-checked inside the transaction so two concurrent lock requests cannot both succeed.
    const updated = await tx.mesocycle.updateMany({
      where: { id, userId, status: 'draft' },
      data: {
        status: 'active',
        lockedAt: new Date(),
        startDate: body.start_date ? new Date(`${body.start_date}T00:00:00Z`) : null,
      },
    });
    if (updated.count !== 1) throw new ApiRouteError('CONFLICT', 'Mesocycle is no longer a draft');

    await tx.mesocycleWeek.createMany({
      data: weeks.map((week) => ({ id: week.id, mesocycleId: id, weekNumber: week.weekNumber, isDeload: week.isDeload })),
    });
    await opts.hooks?.afterWeeksCreated?.();
    await tx.workoutSession.createMany({ data: sessions.map((s) => ({ ...s, status: 'planned' })) });
    await tx.sessionExercise.createMany({ data: exercises });
  });
}
