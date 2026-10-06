import type { MesocycleDetail, MesocycleSummary, PriorityEntry } from '@mesocycle/shared';
import type { Prisma } from '@prisma/client';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { toExerciseDto } from './exercises';
import { requireUuid } from './ids';
import { summarizeVolume } from './volume';

export const DETAIL_INCLUDE = {
  days: {
    orderBy: { sortOrder: 'asc' },
    include: {
      muscleGroups: {
        orderBy: { sortOrder: 'asc' },
        include: { slots: { orderBy: { sortOrder: 'asc' }, include: { exercise: true } } },
      },
    },
  },
  priorities: true,
} satisfies Prisma.MesocycleInclude;

type MesocycleRow = Prisma.MesocycleGetPayload<{ include: typeof DETAIL_INCLUDE }>;
type SummaryRow = Prisma.MesocycleGetPayload<{ include: { _count: { select: { days: true } } } }>;

function isoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function toSummaryDto(row: SummaryRow): MesocycleSummary {
  return {
    id: row.id,
    name: row.name,
    duration_weeks: row.durationWeeks,
    days_per_week: row.daysPerWeek,
    schedule_mode: row.scheduleMode,
    status: row.status,
    start_date: isoDate(row.startDate),
    locked_at: row.lockedAt?.toISOString() ?? null,
    deload_final_week: row.deloadFinalWeek,
    day_count: row._count.days,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function toDetailDto(row: MesocycleRow): Promise<MesocycleDetail> {
  const days = row.days.map((day) => ({
    id: day.id,
    day_number: day.dayNumber,
    weekday: day.weekday,
    day_name: day.dayName,
    sort_order: day.sortOrder,
    muscle_groups: day.muscleGroups.map((g) => ({ id: g.id, muscle: g.muscle, sort_order: g.sortOrder })),
    // Slot order is global across the day, regardless of muscle section (SPEC 5.2).
    slots: day.muscleGroups
      .flatMap((group) => group.slots.map((slot) => ({ group, slot })))
      .sort((a, b) => a.slot.sortOrder - b.slot.sortOrder)
      .map(({ group, slot }) => ({
        id: slot.id,
        muscle: group.muscle,
        exercise_id: slot.exerciseId,
        exercise: toExerciseDto(slot.exercise),
        sort_order: slot.sortOrder,
        target_sets: slot.targetSets,
        rep_range_min: slot.repRangeMin,
        rep_range_max: slot.repRangeMax,
        target_rir: slot.targetRir,
        starting_weight: slot.startingWeight === null ? null : slot.startingWeight.toNumber(),
      })),
  }));

  const priorities: PriorityEntry[] = row.priorities.map((p) => ({ muscle: p.muscle, priority: p.priority }));
  const slots = days.flatMap((day) => day.slots.map((slot) => ({ day, slot })));

  const volume_summary = await summarizeVolume({
    slots: slots.map(({ day, slot }) => ({ exerciseId: slot.exercise_id, sets: slot.target_sets, dayId: day.id })),
    exercises: Object.fromEntries(
      slots.map(({ slot }) => [
        slot.exercise_id,
        { id: slot.exercise_id, primary: slot.exercise.primary_muscle, secondary: slot.exercise.secondary_muscles },
      ]),
    ),
    priorities,
    assignedMuscles: days.flatMap((day) => day.muscle_groups.map((g) => g.muscle)),
  });

  return {
    id: row.id,
    name: row.name,
    duration_weeks: row.durationWeeks,
    days_per_week: row.daysPerWeek,
    schedule_mode: row.scheduleMode,
    status: row.status,
    start_date: isoDate(row.startDate),
    locked_at: row.lockedAt?.toISOString() ?? null,
    deload_final_week: row.deloadFinalWeek,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    days,
    priorities,
    volume_summary,
  };
}

// Another user's mesocycle is indistinguishable from a missing one (SPEC 6).
export async function findOwnedMesocycle(id: string, userId: string) {
  requireUuid(id, 'Mesocycle');
  const mesocycle = await prisma.mesocycle.findFirst({ where: { id, userId } });
  if (!mesocycle) throw new ApiRouteError('NOT_FOUND', 'Mesocycle not found');
  return mesocycle;
}

export async function findOwnedDraft(id: string, userId: string) {
  const mesocycle = await findOwnedMesocycle(id, userId);
  if (mesocycle.status !== 'draft') {
    throw new ApiRouteError('CONFLICT', `Mesocycle is ${mesocycle.status} and can no longer be edited`);
  }
  return mesocycle;
}

export async function loadDetail(id: string, userId: string): Promise<MesocycleDetail> {
  requireUuid(id, 'Mesocycle');
  const row = await prisma.mesocycle.findFirst({ where: { id, userId }, include: DETAIL_INCLUDE });
  if (!row) throw new ApiRouteError('NOT_FOUND', 'Mesocycle not found');
  return toDetailDto(row);
}
