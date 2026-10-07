import { ApiErrorSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../lib/db';
import { cleanCustomData, ctx, patchJson, postJson } from '../../../../../../test/helpers';
import { createLockedMesocycle } from '../../../../../../test/locked';
import { PATCH as patchSession } from '../../../sessions/[id]/route';
import { DELETE } from '../route';
import { POST as drop } from '../drop/route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const resume = (id: string) => POST(postJson(`/api/v1/mesocycles/${id}/resume`, {}), ctx(id));
const statusOf = async (id: string) => (await prisma.mesocycle.findUniqueOrThrow({ where: { id } })).status;
const setSession = (id: string, status: string) => patchSession(patchJson(`/api/v1/sessions/${id}`, { status }), ctx(id));

describe('one active mesocycle at a time', () => {
  it('locking in a second mesocycle pauses the first', async () => {
    const first = await createLockedMesocycle(3);
    const second = await createLockedMesocycle(3);
    expect(await statusOf(first.id)).toBe('paused');
    expect(await statusOf(second.id)).toBe('active');
  });

  it('resuming a paused mesocycle pauses the active one', async () => {
    const first = await createLockedMesocycle(3);
    const second = await createLockedMesocycle(3);
    const response = await resume(first.id);
    expect(response.status).toBe(200);
    expect(MesocycleDetailSchema.parse(await response.json()).status).toBe('active');
    expect(await statusOf(second.id)).toBe('paused');
    // Only paused mesocycles can be resumed.
    expect((await resume(first.id)).status).toBe(409);
  });

  it('a paused mesocycle cannot track workouts or be deleted, but can be dropped', async () => {
    const first = await createLockedMesocycle(3);
    await createLockedMesocycle(3);
    const blocked = await setSession(first.weeks[0]!.sessions[0]!.id, 'completed');
    expect(blocked.status).toBe(409);
    expect(ApiErrorSchema.parse(await blocked.json()).error.message).toContain('Resume');
    expect((await DELETE(postJson(`/api/v1/mesocycles/${first.id}`, {}), ctx(first.id))).status).toBe(409);
    expect((await drop(postJson(`/api/v1/mesocycles/${first.id}/drop`, {}), ctx(first.id))).status).toBe(200);
    expect(await statusOf(first.id)).toBe('dropped');
  });

  it('undoing the last workout of a completed mesocycle while another is active reopens it as paused', async () => {
    const first = await createLockedMesocycle(3);
    const sessions = first.weeks.map((w) => w.sessions[0]!.id);
    for (const id of sessions) await setSession(id, 'completed');
    expect(await statusOf(first.id)).toBe('completed');
    const second = await createLockedMesocycle(3);
    await setSession(sessions[2]!, 'planned');
    expect(await statusOf(first.id)).toBe('paused');
    expect(await statusOf(second.id)).toBe('active');
  });

  it('the database refuses two active mesocycles for one user', async () => {
    const first = await createLockedMesocycle(3);
    await createLockedMesocycle(3);
    await expect(prisma.mesocycle.update({ where: { id: first.id }, data: { status: 'active' } })).rejects.toThrow();
  });
});
