import { ApiErrorSchema, MesocycleDetailSchema, RecordsSchema, WorkoutDetailSchema, type MesocycleDetail } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../../lib/db';
import { cleanCustomData, ctx, otherUserId, patchJson, putJson, request } from '../../../../../../../test/helpers';
import { signInAs } from '../../../../../../../test/session';
import { createLockedMesocycle } from '../../../../../../../test/locked';
import { GET as getRecords } from '../../../../records/route';
import { PATCH as patchSession } from '../../../../sessions/[id]/route';
import { GET as getWorkout } from '../../../../sessions/[id]/workout/route';
import { DELETE, PUT } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const setCtx = (id: string, setNumber: number | string) => ({ params: Promise.resolve({ id, setNumber: String(setNumber) }) });
const put = (id: string, n: number | string, body: unknown) => PUT(putJson(`/api/v1/session-exercises/${id}/sets/${n}`, body), setCtx(id, n));
const del = (id: string, n: number) => DELETE(request(`/api/v1/session-exercises/${id}/sets/${n}`, { method: 'DELETE' }), setCtx(id, n));
const workoutOf = async (response: Response) => {
  expect(response.status).toBe(200);
  return WorkoutDetailSchema.parse(await response.json());
};
const workout = async (sessionId: string) => workoutOf(await getWorkout(request(`/api/v1/sessions/${sessionId}/workout`), ctx(sessionId)));

// Week n's workout and its (only) exercise.
const week = (locked: MesocycleDetail, n: number) => {
  const session = locked.weeks[n - 1]!.sessions[0]!;
  return { sessionId: session.id, itemId: session.exercises[0]!.id };
};

describe('logging sets', () => {
  it('logs a set, starts the workout and un-logs it', async () => {
    const locked = await createLockedMesocycle(3);
    const { sessionId, itemId } = week(locked, 1);

    let detail = await workout(sessionId);
    expect(detail.status).toBe('planned');
    expect(detail.editable).toBe(true);
    expect(detail.weight_unit).toBe('lb');
    expect(detail.exercises[0]).toMatchObject({ target_sets: 10, sets: [], previous: null, best: null });

    detail = await workoutOf(await put(itemId, 1, { weight: 135.5, reps: 8 }));
    expect(detail.status).toBe('in_progress');
    expect(detail.exercises[0]!.sets).toEqual([{ set_number: 1, weight: 135.5, reps: 8, records: [] }]);

    // Logging the same set again corrects it.
    detail = await workoutOf(await put(itemId, 1, { weight: 140, reps: 6 }));
    expect(detail.exercises[0]!.sets).toEqual([{ set_number: 1, weight: 140, reps: 6, records: [] }]);
    expect(await prisma.loggedSet.count({ where: { sessionExerciseId: itemId } })).toBe(1);

    // Extra sets beyond the target are allowed.
    detail = await workoutOf(await put(itemId, 12, { weight: null, reps: 15 }));
    expect(detail.exercises[0]!.sets.map((s) => s.set_number)).toEqual([1, 12]);

    await del(itemId, 12);
    detail = await workoutOf(await del(itemId, 1));
    expect(detail.exercises[0]!.sets).toEqual([]);
    expect(detail.status).toBe('planned');
  });

  it('shows the previous workout and marks personal records', async () => {
    const locked = await createLockedMesocycle(3);
    const one = week(locked, 1);
    await put(one.itemId, 1, { weight: 100, reps: 8 });
    await put(one.itemId, 2, { weight: 100, reps: 7 });
    await patchSession(patchJson(`/api/v1/sessions/${one.sessionId}`, { status: 'completed' }), ctx(one.sessionId));

    const two = week(locked, 2);
    let detail = await workout(two.sessionId);
    expect(detail.exercises[0]!.previous).toMatchObject({
      sets: [
        { set_number: 1, weight: 100, reps: 8 },
        { set_number: 2, weight: 100, reps: 7 },
      ],
    });
    expect(detail.exercises[0]!.best).toMatchObject({ weight: 100, reps: 8, e1rm: 126.7 });

    // Same as before: no record. Heavier: estimated 1RM and weight records on that set only.
    await put(two.itemId, 1, { weight: 100, reps: 8 });
    detail = await workoutOf(await put(two.itemId, 2, { weight: 105, reps: 8 }));
    expect(detail.exercises[0]!.sets.map((s) => s.records)).toEqual([[], ['e1rm', 'weight']]);

    const records = RecordsSchema.parse(await (await getRecords()).json());
    expect(records.exercises).toHaveLength(1);
    expect(records.exercises[0]).toMatchObject({
      exercise: { name: 'Barbell Bench Press' },
      best_e1rm: { weight: 105, reps: 8 },
      heaviest: { weight: 105, reps: 8 },
      most_reps: null,
      sets_logged: 4,
    });
  });

  it('keeps a finished workout with sets started when it is undone', async () => {
    const locked = await createLockedMesocycle(3);
    const { sessionId, itemId } = week(locked, 1);
    await put(itemId, 1, { weight: 60, reps: 10 });
    await patchSession(patchJson(`/api/v1/sessions/${sessionId}`, { status: 'completed' }), ctx(sessionId));
    const response = await patchSession(patchJson(`/api/v1/sessions/${sessionId}`, { status: 'planned' }), ctx(sessionId));
    const detail = MesocycleDetailSchema.parse(await response.json());
    expect(detail.weeks[0]!.sessions[0]!.status).toBe('in_progress');
  });

  it('can correct sets of a completed workout', async () => {
    const locked = await createLockedMesocycle(3);
    const { sessionId, itemId } = week(locked, 1);
    await patchSession(patchJson(`/api/v1/sessions/${sessionId}`, { status: 'completed' }), ctx(sessionId));
    const detail = await workoutOf(await put(itemId, 1, { weight: 60, reps: 10 }));
    expect(detail.status).toBe('completed');
  });

  it.each([
    [{ weight: 60, reps: 0 }, 1],
    [{ weight: -1, reps: 5 }, 1],
    [{ weight: 60.123, reps: 5 }, 1],
    [{ reps: 5 }, 1],
    [{ weight: 60, reps: 5 }, 0],
    [{ weight: 60, reps: 5 }, 21],
    [{ weight: 60, reps: 5 }, 'x'],
  ])('returns 400 for %j on set %s', async (body, n) => {
    const locked = await createLockedMesocycle(3);
    const response = await put(week(locked, 1).itemId, n, body);
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for a skipped workout or a paused or dropped mesocycle', async () => {
    const locked = await createLockedMesocycle(3);
    const one = week(locked, 1);
    await patchSession(patchJson(`/api/v1/sessions/${one.sessionId}`, { status: 'skipped' }), ctx(one.sessionId));
    expect((await put(one.itemId, 1, { weight: 60, reps: 5 })).status).toBe(409);
    expect((await workout(one.sessionId)).editable).toBe(false);

    const two = week(locked, 2);
    for (const status of ['paused', 'dropped'] as const) {
      await prisma.mesocycle.update({ where: { id: locked.id }, data: { status } });
      const response = await put(two.itemId, 1, { weight: 60, reps: 5 });
      expect(response.status).toBe(409);
      expect((await workout(two.sessionId)).editable).toBe(false);
    }
  });

  it("returns 404 for another user's workout or a malformed id", async () => {
    const locked = await createLockedMesocycle(3);
    const { sessionId, itemId } = week(locked, 1);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { userId: await otherUserId() } });
    expect((await put(itemId, 1, { weight: 60, reps: 5 })).status).toBe(404);
    expect((await getWorkout(request('/x'), ctx(sessionId))).status).toBe(404);
    expect((await put('nope', 1, { weight: 60, reps: 5 })).status).toBe(404);
    expect(RecordsSchema.parse(await (await getRecords()).json()).exercises).toEqual([]);
  });

  it('returns 401 when signed out', async () => {
    signInAs(null);
    expect((await getRecords()).status).toBe(401);
  });
});
