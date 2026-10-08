import { ApiErrorSchema, MesocycleDetailSchema, MesocycleListSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, otherUserId, patchJson, postJson, putJson } from '../../../../../test/helpers';
import { PATCH } from '../[id]/route';
import { GET, POST } from '../route';
import { PUT } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

async function create(name: string): Promise<string> {
  return MesocycleDetailSchema.parse(await (await POST(postJson('/api/v1/mesocycles', { name }))).json()).id;
}
const names = async () => MesocycleListSchema.parse(await (await GET()).json()).items.map((i) => i.name);
const reorder = (ids: unknown) => PUT(putJson('/api/v1/mesocycles/order', { ids }));

describe('PUT /api/v1/mesocycles/order', () => {
  it('saves the order, keeps it after edits and puts new mesocycles first', async () => {
    const a = await create('A');
    const b = await create('B');
    const c = await create('C');
    expect(await names()).toEqual(['C', 'B', 'A']);

    const response = await reorder([a, c, b]);
    expect(response.status).toBe(200);
    expect(MesocycleListSchema.parse(await response.json()).items.map((i) => i.name)).toEqual(['A', 'C', 'B']);

    // Editing one does not move it; a new one goes on top.
    await PATCH(patchJson(`/api/v1/mesocycles/${b}`, { name: 'B2' }), { params: Promise.resolve({ id: b }) });
    await create('D');
    expect(await names()).toEqual(['D', 'A', 'C', 'B2']);
  });

  it('does not change updated_at', async () => {
    const a = await create('A');
    const b = await create('B');
    const before = await prisma.mesocycle.findUniqueOrThrow({ where: { id: a } });
    await reorder([a, b]);
    const after = await prisma.mesocycle.findUniqueOrThrow({ where: { id: a } });
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());
    expect(after.position).toBe(0);
  });

  it.each([
    ['a missing id', (ids: string[]) => ids.slice(1)],
    ['a duplicate id', (ids: string[]) => [ids[0], ids[0], ids[1]]],
    ['an unknown id', (ids: string[]) => [...ids.slice(1), '00000000-0000-4000-8000-000000000000']],
    ['an empty list', () => []],
  ])('returns 400 for %s', async (_label, make) => {
    const ids = [await create('A'), await create('B'), await create('C')];
    const response = await reorder(make(ids));
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it("rejects another user's mesocycle", async () => {
    const mine = await create('Mine');
    const theirs = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 3 } });
    expect((await reorder([mine, theirs.id])).status).toBe(400);
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id: theirs.id } })).position).toBe(0);
  });
});
