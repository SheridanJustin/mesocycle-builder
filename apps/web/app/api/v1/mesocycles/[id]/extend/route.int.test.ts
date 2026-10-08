import { ApiErrorSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../lib/db';
import { cleanCustomData, ctx, otherUserId, patchJson, postJson, putJson } from '../../../../../../test/helpers';
import { createLockedMesocycle } from '../../../../../../test/locked';
import { POST as createMesocycle } from '../../route';
import { PATCH as patchSession } from '../../../sessions/[id]/route';
import { PUT as putSet } from '../../../session-exercises/[id]/sets/[setNumber]/route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const extend = (id: string, body: unknown) => POST(postJson(`/api/v1/mesocycles/${id}/extend`, body), ctx(id));
const detailOf = async (response: Response) => {
  expect(response.status).toBe(200);
  return MesocycleDetailSchema.parse(await response.json());
};
const shape = (detail: Awaited<ReturnType<typeof detailOf>>) =>
  detail.weeks.map((w) => [w.week_number, w.is_deload, w.sessions[0]!.exercises[0]!.target_sets, w.sessions[0]!.exercises[0]!.target_rir]);

describe('POST /api/v1/mesocycles/{id}/extend', () => {
  it('adds weeks that continue the RIR ramp', async () => {
    const locked = await createLockedMesocycle(3);
    const detail = await detailOf(await extend(locked.id, { weeks: 2 }));
    expect(detail.duration_weeks).toBe(5);
    const rir = locked.weeks[0]!.sessions[0]!.exercises[0]!.target_rir;
    expect(shape(detail)).toEqual([1, 2, 3, 4, 5].map((n) => [n, false, 10, Math.max(0, rir - (n - 1))]));
  });

  it('keeps an untouched deload week last and copies set changes from the last training week', async () => {
    const locked = await createLockedMesocycle(4, { deload: true });
    await prisma.sessionExercise.update({ where: { id: locked.weeks[2]!.sessions[0]!.exercises[0]!.id }, data: { targetSets: 12 } });
    const detail = await detailOf(await extend(locked.id, { weeks: 1 }));
    expect(detail.deload_final_week).toBe(true);
    expect(shape(detail).map(([n, deload, sets]) => [n, deload, sets])).toEqual([
      [1, false, 10],
      [2, false, 10],
      [3, false, 12],
      [4, false, 12],
      [5, true, 5],
    ]);
  });

  it('adds the weeks after a deload week that has already started', async () => {
    const locked = await createLockedMesocycle(4, { deload: true });
    const deloadItem = locked.weeks[3]!.sessions[0]!.exercises[0]!.id;
    await putSet(putJson('/x', { weight: 60, reps: 10 }), { params: Promise.resolve({ id: deloadItem, setNumber: '1' }) });
    const detail = await detailOf(await extend(locked.id, { weeks: 1 }));
    expect(detail.deload_final_week).toBe(false);
    expect(detail.weeks.map((w) => [w.week_number, w.is_deload])).toEqual([
      [1, false],
      [2, false],
      [3, false],
      [4, true],
      [5, false],
    ]);
  });

  it('reopens a completed mesocycle', async () => {
    const locked = await createLockedMesocycle(3);
    for (const week of locked.weeks) {
      const id = week.sessions[0]!.id;
      await patchSession(patchJson(`/api/v1/sessions/${id}`, { status: 'completed' }), ctx(id));
    }
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: locked.id } })).status).toBe('completed');
    const detail = await detailOf(await extend(locked.id, { weeks: 1 }));
    expect(detail.status).toBe('active');
    expect(detail.ended_at).toBeNull();
    expect(detail.weeks[3]!.sessions[0]!.status).toBe('planned');
  });

  it('refuses more than 10 weeks in total', async () => {
    const locked = await createLockedMesocycle(8);
    const response = await extend(locked.id, { weeks: 3 });
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.details?.[0]?.issue).toBe('At most 2 more');
  });

  it.each([{}, { weeks: 0 }, { weeks: 1.5 }, { weeks: 'two' }])('returns 400 for %j', async (body) => {
    const locked = await createLockedMesocycle(3);
    expect((await extend(locked.id, body)).status).toBe(400);
  });

  it('returns 409 for a draft or a dropped mesocycle, 404 for another user', async () => {
    const draft = MesocycleDetailSchema.parse(await (await createMesocycle(postJson('/api/v1/mesocycles', {}))).json());
    expect((await extend(draft.id, { weeks: 1 })).status).toBe(409);
    const locked = await createLockedMesocycle(3);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { status: 'dropped' } });
    expect((await extend(locked.id, { weeks: 1 })).status).toBe(409);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { userId: await otherUserId() } });
    expect((await extend(locked.id, { weeks: 1 })).status).toBe(404);
  });
});
