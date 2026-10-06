import { ApiErrorSchema, ExerciseListSchema, ExerciseSchema, type Exercise } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/db';
import { cleanCustomData, devUserId, postJson, request } from '../../../../test/helpers';
import { GET, POST } from './route';

async function list(query = '') {
  const response = await GET(request(`/api/v1/exercises${query}`));
  return { status: response.status, body: await response.json() };
}

async function listAll(query = ''): Promise<Exercise[]> {
  const items: Exercise[] = [];
  let cursor: string | null = null;
  do {
    const sep = query ? '&' : '?';
    const { body } = await list(`${query}${cursor ? `${sep}cursor=${cursor}` : ''}`);
    const page = ExerciseListSchema.parse(body);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
}

const customBody = {
  name: 'My Cable Press',
  primary_muscle: 'chest',
  secondary_muscles: ['triceps'],
  equipment_type: 'cable',
  movement_type: 'compound',
};

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

describe('GET /api/v1/exercises', () => {
  it('returns the global catalog with the default page size', async () => {
    const { status, body } = await list();
    expect(status).toBe(200);
    const page = ExerciseListSchema.parse(body);
    expect(page.items).toHaveLength(50);
    expect(page.next_cursor).not.toBeNull();
    expect(page.items.every((e) => !e.is_custom)).toBe(true);
  });

  it('pages through the whole catalog in name order without gaps or duplicates', async () => {
    const all = await listAll('?limit=20');
    expect(all.length).toBeGreaterThanOrEqual(90);
    const expected = await prisma.exercise.findMany({
      where: { userId: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    expect(all.map((e) => e.id)).toEqual(expected.map((e) => e.id));
  });

  it('honors limit and sets next_cursor only when more rows remain', async () => {
    const total = await prisma.exercise.count({ where: { userId: null } });
    const small = ExerciseListSchema.parse((await list('?limit=3')).body);
    expect(small.items).toHaveLength(3);
    expect(small.next_cursor).not.toBeNull();

    const exact = ExerciseListSchema.parse((await list(`?limit=${total}`)).body);
    expect(exact.items).toHaveLength(total);
    expect(exact.next_cursor).toBeNull();
  });

  it('filters by primary muscle', async () => {
    const items = await listAll('?primary_muscle=chest');
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.every((e) => e.primary_muscle === 'chest')).toBe(true);
  });

  it('filters by equipment and movement type', async () => {
    const items = await listAll('?equipment=cable&movement_type=isolation');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.equipment_type === 'cable' && e.movement_type === 'isolation')).toBe(true);
  });

  it('combines filters', async () => {
    const items = await listAll('?primary_muscle=quads&equipment=machine');
    expect(items.map((e) => e.name)).toEqual(expect.arrayContaining(['Leg Press', 'Leg Extension']));
    expect(items.every((e) => e.primary_muscle === 'quads' && e.equipment_type === 'machine')).toBe(true);
  });

  it('searches names case-insensitively by substring', async () => {
    const items = await listAll('?search=BENCH');
    expect(items.map((e) => e.name)).toEqual(expect.arrayContaining(['Barbell Bench Press', 'Close-Grip Bench Press']));
    expect(items.every((e) => e.name.toLowerCase().includes('bench'))).toBe(true);
  });

  it('returns an empty page when nothing matches', async () => {
    const { body } = await list('?search=zzzznotanexercise');
    expect(ExerciseListSchema.parse(body)).toEqual({ items: [], next_cursor: null });
  });

  it('includes the current user custom exercises but not another user\'s', async () => {
    const other = await prisma.user.create({ data: { email: 'other@example.com' } });
    await prisma.exercise.create({
      data: { name: 'Other User Move', primaryMuscle: 'chest', equipmentType: 'cable', movementType: 'isolation', isCustom: true, userId: other.id },
    });
    expect((await POST(postJson('/api/v1/exercises', customBody))).status).toBe(201);

    const names = (await listAll('?primary_muscle=chest')).map((e) => e.name);
    expect(names).toContain('My Cable Press');
    expect(names).not.toContain('Other User Move');
  });

  it.each(['?primary_muscle=neck', '?equipment=kettlebell', '?limit=0', '?limit=201', '?limit=abc', '?cursor=garbage', '?search='])(
    'returns 400 VALIDATION_ERROR for %s',
    async (query) => {
      const { status, body } = await list(query);
      expect(status).toBe(400);
      expect(ApiErrorSchema.parse(body).error.code).toBe('VALIDATION_ERROR');
    },
  );
});

describe('POST /api/v1/exercises', () => {
  it('creates a custom exercise owned by the current user', async () => {
    const response = await POST(postJson('/api/v1/exercises', customBody));
    expect(response.status).toBe(201);
    const created = ExerciseSchema.parse(await response.json());
    expect(created).toMatchObject({ name: 'My Cable Press', is_custom: true, primary_muscle: 'chest', secondary_muscles: ['triceps'] });
    const row = await prisma.exercise.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.userId).toBe(await devUserId());
    expect(row.isCustom).toBe(true);
  });

  it('defaults secondary_muscles and trims the name', async () => {
    const { secondary_muscles: _unused, ...rest } = customBody;
    void _unused;
    const response = await POST(postJson('/api/v1/exercises', { ...rest, name: '  Trimmed Name  ' }));
    expect(response.status).toBe(201);
    expect(ExerciseSchema.parse(await response.json())).toMatchObject({ name: 'Trimmed Name', secondary_muscles: [] });
  });

  it('returns 409 CONFLICT for a duplicate name, ignoring case', async () => {
    expect((await POST(postJson('/api/v1/exercises', customBody))).status).toBe(201);
    for (const name of ['My Cable Press', 'my cable press']) {
      const response = await POST(postJson('/api/v1/exercises', { ...customBody, name }));
      expect(response.status).toBe(409);
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
    }
    expect(await prisma.exercise.count({ where: { isCustom: true } })).toBe(1);
  });

  it('lets different users use the same custom name', async () => {
    const other = await prisma.user.create({ data: { email: 'other@example.com' } });
    await prisma.exercise.create({
      data: { name: 'My Cable Press', primaryMuscle: 'chest', equipmentType: 'cable', movementType: 'compound', isCustom: true, userId: other.id },
    });
    expect((await POST(postJson('/api/v1/exercises', customBody))).status).toBe(201);
  });

  it('allows a custom name that matches a global exercise name', async () => {
    expect((await POST(postJson('/api/v1/exercises', { ...customBody, name: 'Cable Fly' }))).status).toBe(201);
  });

  it.each([
    ['blank name', { ...customBody, name: '   ' }],
    ['unknown muscle', { ...customBody, primary_muscle: 'neck' }],
    ['primary as secondary', { ...customBody, secondary_muscles: ['chest'] }],
    ['missing equipment', { ...customBody, equipment_type: undefined }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await POST(postJson('/api/v1/exercises', body));
    expect(response.status).toBe(400);
    const parsed = ApiErrorSchema.parse(await response.json());
    expect(parsed.error.code).toBe('VALIDATION_ERROR');
    expect(parsed.error.details?.length).toBeGreaterThan(0);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const response = await POST(request('/api/v1/exercises', { method: 'POST', body: '{nope' }));
    expect(response.status).toBe(400);
  });
});
