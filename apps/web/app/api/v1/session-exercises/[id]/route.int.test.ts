import { ApiErrorSchema, ChangeSetsResultSchema, MesocycleDetailSchema, type MesocycleDetail } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, ctx, patchJson, putJson } from '../../../../../test/helpers';
import { createLockedMesocycle } from '../../../../../test/locked';
import { GET as getMesocycle } from '../../mesocycles/[id]/route';
import { PUT as putSet } from './sets/[setNumber]/route';
import { PATCH } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const change = (id: string, body: unknown) => PATCH(patchJson(`/api/v1/session-exercises/${id}`, body), ctx(id));
const result = async (response: Response) => {
  expect(response.status).toBe(200);
  return ChangeSetsResultSchema.parse(await response.json());
};
const logSet = (id: string, n: number, weight: number, reps: number) =>
  putSet(putJson(`/api/v1/session-exercises/${id}/sets/${n}`, { weight, reps }), { params: Promise.resolve({ id, setNumber: String(n) }) });
const itemOf = (detail: MesocycleDetail, week: number) => detail.weeks[week - 1]!.sessions[0]!.exercises[0]!.id;
async function targets(id: string): Promise<number[]> {
  const detail = MesocycleDetailSchema.parse(await (await getMesocycle(new Request('http://x'), ctx(id))).json());
  return detail.weeks.map((w) => w.sessions[0]!.exercises[0]!.target_sets);
}

describe('PATCH /api/v1/session-exercises/{id}', () => {
  it('adds and removes sets and carries the count over to later weeks that have not started', async () => {
    // 4 weeks of 10 bench sets; week 4 is a deload (5 sets).
    const locked = await createLockedMesocycle(4, { deload: true });
    expect(await targets(locked.id)).toEqual([10, 10, 10, 5]);

    let body = await result(await change(itemOf(locked, 1), { op: 'add_set' }));
    expect(body.workout.exercises[0]!.target_sets).toBe(11);
    expect(body.carried_weeks).toEqual([2, 3, 4]);
    expect(await targets(locked.id)).toEqual([11, 11, 11, 6]);

    // A started workout keeps its own count.
    await logSet(itemOf(locked, 2), 1, 100, 8);
    body = await result(await change(itemOf(locked, 1), { op: 'remove_set', set_number: 11 }));
    expect(body.carried_weeks).toEqual([3, 4]);
    expect(await targets(locked.id)).toEqual([10, 11, 10, 5]);

    // Changes in the deload week stay there.
    body = await result(await change(itemOf(locked, 4), { op: 'add_set' }));
    expect(body.carried_weeks).toEqual([]);
    expect(await targets(locked.id)).toEqual([10, 11, 10, 6]);
  });

  it('removing a set moves the logged sets after it up', async () => {
    const locked = await createLockedMesocycle(3);
    const item = itemOf(locked, 1);
    await logSet(item, 1, 100, 8);
    await logSet(item, 3, 105, 6);
    const body = await result(await change(item, { op: 'remove_set', set_number: 2 }));
    expect(body.workout.exercises[0]!.target_sets).toBe(9);
    expect(body.workout.exercises[0]!.sets.map((s) => [s.set_number, s.weight, s.reps])).toEqual([
      [1, 100, 8],
      [2, 105, 6],
    ]);
  });

  it('refuses to remove a logged set, the last set, or a set that does not exist', async () => {
    const locked = await createLockedMesocycle(3);
    const item = itemOf(locked, 1);
    await logSet(item, 1, 100, 8);
    const logged = await change(item, { op: 'remove_set', set_number: 1 });
    expect(logged.status).toBe(409);
    expect(ApiErrorSchema.parse(await logged.json()).error.message).toMatch(/Un-tick/);
    expect((await change(item, { op: 'remove_set', set_number: 11 })).status).toBe(404);

    const other = itemOf(locked, 2);
    await prisma.sessionExercise.update({ where: { id: other }, data: { targetSets: 1 } });
    expect((await change(other, { op: 'remove_set', set_number: 1 })).status).toBe(409);
    await prisma.sessionExercise.update({ where: { id: other }, data: { targetSets: 20 } });
    expect((await change(other, { op: 'add_set' })).status).toBe(409);
  });

  it.each([{}, { op: 'remove_set' }, { op: 'remove_set', set_number: 0 }, { op: 'grow' }])('returns 400 for %j', async (body) => {
    const locked = await createLockedMesocycle(3);
    expect((await change(itemOf(locked, 1), body)).status).toBe(400);
  });

  it('returns 409 when the mesocycle is paused', async () => {
    const locked = await createLockedMesocycle(3);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { status: 'paused' } });
    expect((await change(itemOf(locked, 1), { op: 'add_set' })).status).toBe(409);
  });
});
