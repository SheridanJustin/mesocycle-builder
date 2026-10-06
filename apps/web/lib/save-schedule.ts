import type { PutSchedule } from '@mesocycle/shared';
import { prisma } from './db';

// Replaces the whole template in one transaction (SPEC 6.2 PUT /schedule). Days, muscle
// groups and slots cascade from the day delete, so the result never depends on prior state.
export async function replaceSchedule(mesocycleId: string, schedule: PutSchedule): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.mesocycleDay.deleteMany({ where: { mesocycleId } });
    await tx.mesocycleMusclePriority.deleteMany({ where: { mesocycleId } });

    for (const day of schedule.days) {
      const created = await tx.mesocycleDay.create({
        data: {
          mesocycleId,
          dayNumber: day.day_number,
          weekday: day.weekday,
          dayName: day.day_name,
          sortOrder: day.sort_order,
          muscleGroups: { create: day.muscle_groups.map((g) => ({ muscle: g.muscle, sortOrder: g.sort_order })) },
        },
        include: { muscleGroups: true },
      });
      const groupIdByMuscle = new Map(created.muscleGroups.map((g) => [g.muscle, g.id]));
      await tx.exerciseSlot.createMany({
        data: day.slots.map((slot) => ({
          // The schema guarantees every slot muscle has a group on this day.
          dayMuscleGroupId: groupIdByMuscle.get(slot.muscle) as string,
          exerciseId: slot.exercise_id,
          sortOrder: slot.sort_order,
          targetSets: slot.target_sets,
          repRangeMin: slot.rep_range_min,
          repRangeMax: slot.rep_range_max,
          targetRir: slot.target_rir,
          startingWeight: slot.starting_weight,
        })),
      });
    }

    await tx.mesocycleMusclePriority.createMany({
      data: schedule.priorities.map((p) => ({ mesocycleId, muscle: p.muscle, priority: p.priority })),
    });
    // Bump updated_at even when only children changed.
    await tx.mesocycle.update({ where: { id: mesocycleId }, data: { updatedAt: new Date() } });
  });
}
