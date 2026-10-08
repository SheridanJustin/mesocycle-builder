import {
  bestSet,
  summarizeRecords,
  workoutRecords,
  type LogSet,
  type Records,
  type WorkoutDetail,
  type WorkoutExercise,
} from '@mesocycle/shared';
import type { User } from '@prisma/client';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { toExerciseDto } from './exercises';
import { requireUuid } from './ids';
import { toWeightUnit } from './me';

// Workout logging (SPEC decision 19): sets with reps and weight, previous numbers and personal bests.

// Sets can be logged while the mesocycle runs, and fixed after it completed.
const LOGGABLE = ['active', 'completed'];

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const toNumber = (value: { toNumber(): number } | null) => (value === null ? null : value.toNumber());

type HistorySet = { exerciseId: string; sessionId: string; setNumber: number; weight: number | null; reps: number; date: string; at: Date };

// Every logged set of these exercises by this user, oldest first.
async function exerciseHistory(userId: string, exerciseIds: readonly string[]): Promise<HistorySet[]> {
  const rows = await prisma.loggedSet.findMany({
    where: { reps: { not: null }, sessionExercise: { exerciseId: { in: [...exerciseIds] }, session: { week: { mesocycle: { userId } } } } },
    select: { setNumber: true, weight: true, reps: true, createdAt: true, sessionExercise: { select: { exerciseId: true, sessionId: true } } },
    orderBy: [{ createdAt: 'asc' }, { setNumber: 'asc' }],
  });
  return rows.map((row) => ({
    exerciseId: row.sessionExercise.exerciseId,
    sessionId: row.sessionExercise.sessionId,
    setNumber: row.setNumber,
    weight: toNumber(row.weight),
    reps: row.reps ?? 0,
    date: isoDay(row.createdAt),
    at: row.createdAt,
  }));
}

// The sets of the most recent other workout in which the exercise was logged.
function previousWorkout(history: readonly HistorySet[]): WorkoutExercise['previous'] {
  const last = history[history.length - 1];
  if (!last) return null;
  const sets = history
    .filter((set) => set.sessionId === last.sessionId)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((set) => ({ set_number: set.setNumber, weight: set.weight, reps: set.reps }));
  return { date: last.date, sets };
}

async function findOwnedSession(sessionId: string, userId: string) {
  requireUuid(sessionId, 'Workout');
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, week: { mesocycle: { userId } } },
    include: {
      day: { select: { dayName: true } },
      week: { select: { weekNumber: true, isDeload: true, mesocycle: { select: { id: true, name: true, status: true } } } },
      exercises: { orderBy: { sortOrder: 'asc' }, include: { exercise: true, loggedSets: { orderBy: { setNumber: 'asc' } } } },
    },
  });
  if (!session) throw new ApiRouteError('NOT_FOUND', 'Workout not found');
  return session;
}

// GET /sessions/{id}/workout
export async function loadWorkout(sessionId: string, user: User): Promise<WorkoutDetail> {
  const session = await findOwnedSession(sessionId, user.id);
  const history = (await exerciseHistory(user.id, session.exercises.map((item) => item.exerciseId))).filter((set) => set.sessionId !== session.id);
  const { mesocycle } = session.week;

  return {
    id: session.id,
    status: session.status as WorkoutDetail['status'],
    day_name: session.day.dayName,
    scheduled_date: session.scheduledDate ? isoDay(session.scheduledDate) : null,
    week_number: session.week.weekNumber,
    is_deload: session.week.isDeload,
    mesocycle: { id: mesocycle.id, name: mesocycle.name, status: mesocycle.status },
    editable: LOGGABLE.includes(mesocycle.status) && session.status !== 'skipped',
    weight_unit: toWeightUnit(user.weightUnit),
    exercises: session.exercises.map((item) => {
      const past = history.filter((set) => set.exerciseId === item.exerciseId);
      const sets = item.loggedSets
        .filter((set) => set.reps !== null)
        .map((set) => ({ set_number: set.setNumber, weight: toNumber(set.weight), reps: set.reps ?? 0 }));
      const records = workoutRecords(past, sets);
      return {
        id: item.id,
        exercise: toExerciseDto(item.exercise),
        target_sets: item.targetSets,
        rep_range_min: item.repRangeMin,
        rep_range_max: item.repRangeMax,
        target_rir: item.targetRir,
        target_weight: toNumber(item.targetWeight),
        sets: sets.map((set) => ({ ...set, records: records.get(set.set_number) ?? [] })),
        previous: previousWorkout(past),
        best: bestSet(past),
      };
    }),
  };
}

async function findLoggableExercise(sessionExerciseId: string, userId: string) {
  requireUuid(sessionExerciseId, 'Exercise');
  const item = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { week: { mesocycle: { userId } } } },
    include: { session: { include: { week: { include: { mesocycle: { select: { status: true } } } } } } },
  });
  if (!item) throw new ApiRouteError('NOT_FOUND', 'Exercise not found');
  const { status } = item.session.week.mesocycle;
  if (status === 'paused') throw new ApiRouteError('CONFLICT', 'This mesocycle is paused. Resume it to log workouts.');
  if (!LOGGABLE.includes(status)) throw new ApiRouteError('CONFLICT', `Workouts of a ${status} mesocycle cannot be logged`);
  if (item.session.status === 'skipped') throw new ApiRouteError('CONFLICT', 'This workout was skipped. Undo the skip to log it.');
  return item;
}

// PUT /session-exercises/{id}/sets/{n}: logs (or corrects) one set. The first logged set starts
// the workout (planned → in_progress). Returns the workout's session id.
export async function logSet(sessionExerciseId: string, setNumber: number, userId: string, body: LogSet): Promise<string> {
  const item = await findLoggableExercise(sessionExerciseId, userId);
  await prisma.$transaction([
    prisma.loggedSet.upsert({
      where: { sessionExerciseId_setNumber: { sessionExerciseId, setNumber } },
      create: { sessionExerciseId, setNumber, reps: body.reps, weight: body.weight },
      update: { reps: body.reps, weight: body.weight },
    }),
    prisma.workoutSession.updateMany({ where: { id: item.sessionId, status: 'planned' }, data: { status: 'in_progress' } }),
  ]);
  return item.sessionId;
}

// DELETE /session-exercises/{id}/sets/{n}: un-logs a set. A started workout with no sets left is
// planned again.
export async function deleteSet(sessionExerciseId: string, setNumber: number, userId: string): Promise<string> {
  const item = await findLoggableExercise(sessionExerciseId, userId);
  await prisma.$transaction(async (tx) => {
    await tx.loggedSet.deleteMany({ where: { sessionExerciseId, setNumber } });
    const left = await tx.loggedSet.count({ where: { sessionExercise: { sessionId: item.sessionId } } });
    if (left === 0) await tx.workoutSession.updateMany({ where: { id: item.sessionId, status: 'in_progress' }, data: { status: 'planned' } });
  });
  return item.sessionId;
}

// Whether a workout has any logged set (undoing a finished workout keeps it started).
export async function hasLoggedSets(sessionId: string): Promise<boolean> {
  return (await prisma.loggedSet.count({ where: { sessionExercise: { sessionId } } })) > 0;
}

// GET /records: personal bests per exercise, most recently trained first.
export async function loadRecords(user: User): Promise<Records> {
  const rows = await prisma.loggedSet.findMany({
    where: { reps: { not: null }, sessionExercise: { session: { week: { mesocycle: { userId: user.id } } } } },
    select: {
      weight: true,
      reps: true,
      createdAt: true,
      sessionExercise: { select: { exercise: { select: { id: true, name: true, primaryMuscle: true } } } },
    },
    orderBy: [{ createdAt: 'asc' }, { setNumber: 'asc' }],
  });

  const byExercise = new Map<string, { exercise: Records['exercises'][number]['exercise']; sets: { weight: number | null; reps: number; date: string }[] }>();
  for (const row of rows) {
    const { exercise } = row.sessionExercise;
    const entry = byExercise.get(exercise.id) ?? { exercise: { id: exercise.id, name: exercise.name, primary_muscle: exercise.primaryMuscle }, sets: [] };
    entry.sets.push({ weight: toNumber(row.weight), reps: row.reps ?? 0, date: isoDay(row.createdAt) });
    byExercise.set(exercise.id, entry);
  }

  const exercises = [...byExercise.values()].map(({ exercise, sets }) => ({
    exercise,
    ...summarizeRecords(sets),
    sets_logged: sets.length,
    last_logged: sets[sets.length - 1]?.date ?? '',
  }));
  exercises.sort((a, b) => b.last_logged.localeCompare(a.last_logged) || a.exercise.name.localeCompare(b.exercise.name));
  return { weight_unit: toWeightUnit(user.weightUnit), exercises };
}
