import { MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../lib/db';
import { cleanCustomData, ctx, otherUserId, postJson } from '../../../../../../test/helpers';
import { createLockedMesocycle } from '../../../../../../test/locked';
import { POST as createMesocycle } from '../../route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const drop = (id: string) => POST(postJson(`/api/v1/mesocycles/${id}/drop`, {}), ctx(id));

describe('POST /api/v1/mesocycles/{id}/drop', () => {
  it('drops an active mesocycle and keeps its workouts', async () => {
    const locked = await createLockedMesocycle(3);
    const response = await drop(locked.id);
    expect(response.status).toBe(200);
    const body = MesocycleDetailSchema.parse(await response.json());
    expect(body.status).toBe('dropped');
    expect(body.ended_at).not.toBeNull();
    expect(body.weeks).toHaveLength(3);
    expect((await drop(locked.id)).status).toBe(409);
  });

  it('returns 409 for a draft or a completed mesocycle', async () => {
    const draft = MesocycleDetailSchema.parse(await (await createMesocycle(postJson('/api/v1/mesocycles', {}))).json());
    expect((await drop(draft.id)).status).toBe(409);
    const locked = await createLockedMesocycle(3);
    await prisma.mesocycle.update({ where: { id: locked.id }, data: { status: 'completed' } });
    expect((await drop(locked.id)).status).toBe(409);
  });

  it("returns 404 for another user's mesocycle", async () => {
    const theirs = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 7, status: 'active' } });
    expect((await drop(theirs.id)).status).toBe(404);
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: theirs.id } })).status).toBe('active');
  });
});
