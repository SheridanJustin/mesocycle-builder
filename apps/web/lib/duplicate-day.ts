import { MAX_CYCLE_DAYS } from '@mesocycle/shared';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { defaultCopyName, positionsAfterInsert } from './days';
import { requireUuid } from './ids';

type Params = { mesocycleId: string; sourceDayId: string; targetPosition: number; newName?: string };

// Deep-copies a day (muscle groups and all slot metrics) to `targetPosition` (1-based) and
// renumbers sort_order/day_number to 1..n. Only for numbered days: a Mon-Sun week is fixed at 7.
export async function duplicateDay({ mesocycleId, sourceDayId, targetPosition, newName }: Params): Promise<void> {
  requireUuid(sourceDayId, 'Day');

  await prisma.$transaction(async (tx) => {
    const mesocycle = await tx.mesocycle.findUniqueOrThrow({ where: { id: mesocycleId } });
    if (mesocycle.scheduleMode === 'calendar') {
      throw new ApiRouteError('CONFLICT', 'A Mon-Sun week has exactly 7 days; switch to numbered days to add one');
    }
    const days = await tx.mesocycleDay.findMany({ where: { mesocycleId }, orderBy: { sortOrder: 'asc' } });
    const source = days.find((day) => day.id === sourceDayId);
    if (!source) throw new ApiRouteError('NOT_FOUND', 'Day not found');
    if (days.length >= MAX_CYCLE_DAYS) {
      throw new ApiRouteError('CONFLICT', `A mesocycle can have at most ${MAX_CYCLE_DAYS} days`);
    }
    if (targetPosition > days.length + 1) {
      throw new ApiRouteError('VALIDATION_ERROR', 'Request validation failed', [
        { path: 'target_position', issue: `Must be at most ${days.length + 1}` },
      ]);
    }

    const groups = await tx.dayMuscleGroup.findMany({
      where: { dayId: source.id },
      orderBy: { sortOrder: 'asc' },
      include: { slots: { orderBy: { sortOrder: 'asc' } } },
    });

    // Free the unique (mesocycle_id, sort_order) values before renumbering.
    for (const day of days) {
      await tx.mesocycleDay.update({ where: { id: day.id }, data: { sortOrder: -(day.sortOrder + 1) } });
    }

    const copy = await tx.mesocycleDay.create({
      data: {
        mesocycleId,
        dayNumber: targetPosition,
        weekday: null,
        dayName: newName ?? defaultCopyName(source.dayName),
        sortOrder: targetPosition,
        muscleGroups: { create: groups.map((g) => ({ muscle: g.muscle, sortOrder: g.sortOrder })) },
      },
      include: { muscleGroups: true },
    });
    const copyGroupByMuscle = new Map(copy.muscleGroups.map((g) => [g.muscle, g.id]));
    await tx.exerciseSlot.createMany({
      data: groups.flatMap((group) =>
        group.slots.map((slot) => ({
          dayMuscleGroupId: copyGroupByMuscle.get(group.muscle) as string,
          exerciseId: slot.exerciseId,
          sortOrder: slot.sortOrder,
          targetSets: slot.targetSets,
          repRangeMin: slot.repRangeMin,
          repRangeMax: slot.repRangeMax,
          targetRir: slot.targetRir,
          startingWeight: slot.startingWeight,
        })),
      ),
    });

    for (const { id, position } of positionsAfterInsert(days, copy.id, targetPosition)) {
      await tx.mesocycleDay.update({ where: { id }, data: { sortOrder: position, dayNumber: position } });
    }
    await tx.mesocycle.update({ where: { id: mesocycleId }, data: { daysPerWeek: days.length + 1, updatedAt: new Date() } });
  });
}
