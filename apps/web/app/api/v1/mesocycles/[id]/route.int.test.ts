import { ApiErrorSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, ctx, otherUserId, patchJson, postJson, request } from '../../../../../test/helpers';
import { POST } from '../route';
import { DELETE, GET, PATCH } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

async function createDraft(): Promise<string> {
  const body = MesocycleDetailSchema.parse(
    await (await POST(postJson('/api/v1/mesocycles', { name: 'Block', days_per_week: 3, schedule_mode: 'relative' }))).json(),
  );
  return body.id;
}

async function otherUsersMesocycle(): Promise<string> {
  const row = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 3 } });
  return row.id;
}

describe('GET /api/v1/mesocycles/{id}', () => {
  it('returns the full mesocycle with a volume_summary', async () => {
    const id = await createDraft();
    const response = await GET(request(`/api/v1/mesocycles/${id}`), ctx(id));
    expect(response.status).toBe(200);
    const body = MesocycleDetailSchema.parse(await response.json());
    expect(body.id).toBe(id);
    expect(body.days).toHaveLength(3);
    expect(body.volume_summary).toEqual({ summary: {} });
  });

  it('returns 404 for another user\'s mesocycle, an unknown id and a malformed id', async () => {
    const theirs = await otherUsersMesocycle();
    for (const id of [theirs, '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001', 'not-a-uuid']) {
      const response = await GET(request(`/api/v1/mesocycles/${id}`), ctx(id));
      expect(response.status).toBe(404);
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('NOT_FOUND');
    }
  });
});

describe('PATCH /api/v1/mesocycles/{id}', () => {
  it('updates name, duration_weeks and deload_final_week', async () => {
    const id = await createDraft();
    const response = await PATCH(
      patchJson(`/api/v1/mesocycles/${id}`, { name: 'Renamed', duration_weeks: 6, deload_final_week: true }),
      ctx(id),
    );
    expect(response.status).toBe(200);
    expect(MesocycleDetailSchema.parse(await response.json())).toMatchObject({
      name: 'Renamed',
      duration_weeks: 6,
      deload_final_week: true,
    });
  });

  it('leaves omitted fields untouched', async () => {
    const id = await createDraft();
    await PATCH(patchJson(`/api/v1/mesocycles/${id}`, { deload_final_week: true }), ctx(id));
    const row = await prisma.mesocycle.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ name: 'Block', durationWeeks: 4, deloadFinalWeek: true });
  });

  it.each([{}, { duration_weeks: 3 }, { name: '' }])('returns 400 for %j', async (body) => {
    const id = await createDraft();
    const response = await PATCH(patchJson(`/api/v1/mesocycles/${id}`, body), ctx(id));
    expect(response.status).toBe(400);
  });

  it.each(['active', 'completed'] as const)('returns 409 when the mesocycle is %s', async (status) => {
    const id = await createDraft();
    await prisma.mesocycle.update({ where: { id }, data: { status } });
    const response = await PATCH(patchJson(`/api/v1/mesocycles/${id}`, { name: 'Nope' }), ctx(id));
    expect(response.status).toBe(409);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id } })).name).toBe('Block');
  });

  it('returns 404 for another user\'s mesocycle', async () => {
    const theirs = await otherUsersMesocycle();
    const response = await PATCH(patchJson(`/api/v1/mesocycles/${theirs}`, { name: 'Hijack' }), ctx(theirs));
    expect(response.status).toBe(404);
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: theirs } })).name).toBe('Theirs');
  });
});

describe('DELETE /api/v1/mesocycles/{id}', () => {
  it('deletes a draft and cascades to its days', async () => {
    const id = await createDraft();
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: id } })).toBe(3);
    const response = await DELETE(request(`/api/v1/mesocycles/${id}`, { method: 'DELETE' }), ctx(id));
    expect(response.status).toBe(204);
    expect(await prisma.mesocycle.count({ where: { id } })).toBe(0);
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: id } })).toBe(0);
  });

  it.each(['active', 'completed'] as const)('returns 409 for a %s mesocycle and keeps it', async (status) => {
    const id = await createDraft();
    await prisma.mesocycle.update({ where: { id }, data: { status } });
    const response = await DELETE(request(`/api/v1/mesocycles/${id}`, { method: 'DELETE' }), ctx(id));
    expect(response.status).toBe(409);
    expect(await prisma.mesocycle.count({ where: { id } })).toBe(1);
  });

  it('returns 404 for another user\'s mesocycle and keeps it', async () => {
    const theirs = await otherUsersMesocycle();
    const response = await DELETE(request(`/api/v1/mesocycles/${theirs}`, { method: 'DELETE' }), ctx(theirs));
    expect(response.status).toBe(404);
    expect(await prisma.mesocycle.count({ where: { id: theirs } })).toBe(1);
  });
});
