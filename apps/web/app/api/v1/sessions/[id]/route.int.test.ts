import { ApiErrorSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, ctx, otherUserId, patchJson } from '../../../../../test/helpers';
import { createLockedMesocycle } from '../../../../../test/locked';
import { PATCH } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const patch = (id: string, body: unknown) => PATCH(patchJson(`/api/v1/sessions/${id}`, body), ctx(id));
const detailOf = async (response: Response) => MesocycleDetailSchema.parse(await response.json());

describe('PATCH /api/v1/sessions/{id}', () => {
  it('completes and skips workouts, completes weeks, then the mesocycle, and can undo', async () => {
    const locked = await createLockedMesocycle(3);
    const [w1, w2, w3] = locked.weeks.map((w) => w.sessions[0]!.id) as [string, string, string];

    let detail = await detailOf(await patch(w1, { status: 'completed' }));
    expect(detail.weeks.map((w) => w.is_complete)).toEqual([true, false, false]);
    expect(detail.weeks[0]!.sessions[0]!.status).toBe('completed');
    expect(detail.status).toBe('active');

    detail = await detailOf(await patch(w2, { status: 'skipped' }));
    expect(detail.weeks.map((w) => w.is_complete)).toEqual([true, true, false]);
    expect(detail.ended_at).toBeNull();

    detail = await detailOf(await patch(w3, { status: 'completed' }));
    expect(detail.status).toBe('completed');
    expect(detail.ended_at).not.toBeNull();

    // Undoing a workout reopens the mesocycle.
    detail = await detailOf(await patch(w3, { status: 'planned' }));
    expect(detail.status).toBe('active');
    expect(detail.ended_at).toBeNull();
    expect(detail.weeks.map((w) => w.is_complete)).toEqual([true, true, false]);
  });

  it('rejects unknown statuses', async () => {
    const locked = await createLockedMesocycle(3);
    for (const status of ['in_progress', 'done', undefined]) {
      const response = await patch(locked.weeks[0]!.sessions[0]!.id, { status });
      expect(response.status).toBe(400);
    }
  });

  it('returns 409 once the mesocycle is dropped', async () => {
    const locked = await createLockedMesocycle(3);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { status: 'dropped' } });
    const response = await patch(locked.weeks[0]!.sessions[0]!.id, { status: 'completed' });
    expect(response.status).toBe(409);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
  });

  it("returns 404 for another user's workout or a malformed id", async () => {
    const locked = await createLockedMesocycle(3);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { userId: await otherUserId() } });
    expect((await patch(locked.weeks[0]!.sessions[0]!.id, { status: 'completed' })).status).toBe(404);
    expect((await patch('nope', { status: 'completed' })).status).toBe(404);
  });
});
