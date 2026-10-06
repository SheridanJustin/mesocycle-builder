import { ApiErrorSchema, MesocycleDetailSchema, MesocycleListSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/db';
import { cleanCustomData, devUserId, otherUserId, postJson } from '../../../../test/helpers';
import { GET, POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const create = (body: unknown) => POST(postJson('/api/v1/mesocycles', body));

describe('POST /api/v1/mesocycles', () => {
  it('creates an untitled Mon-Sun draft from an empty body', async () => {
    const response = await create({});
    expect(response.status).toBe(201);
    const body = MesocycleDetailSchema.parse(await response.json());
    expect(body).toMatchObject({
      name: 'Untitled block',
      duration_weeks: 4,
      days_per_week: 7,
      schedule_mode: 'calendar',
      status: 'draft',
      start_date: null,
      deload_final_week: false,
      priorities: [],
      volume_summary: { summary: {} },
    });
    expect(body.days.map((d) => [d.day_name, d.weekday, d.sort_order])).toEqual([
      ['Mon', 0, 1],
      ['Tue', 1, 2],
      ['Wed', 2, 3],
      ['Thu', 3, 4],
      ['Fri', 4, 5],
      ['Sat', 5, 6],
      ['Sun', 6, 7],
    ]);
    expect(body.days.every((d) => d.slots.length === 0 && d.muscle_groups.length === 0)).toBe(true);
  });

  it('creates numbered days without weekdays in relative mode', async () => {
    const body = MesocycleDetailSchema.parse(
      await (await create({ name: 'Ten', days_per_week: 10, duration_weeks: 5, schedule_mode: 'relative' })).json(),
    );
    expect(body.duration_weeks).toBe(5);
    expect(body.days.map((d) => d.day_name)).toEqual(Array.from({ length: 10 }, (_, i) => `Day ${i + 1}`));
    expect(body.days.every((d) => d.weekday === null)).toBe(true);
  });

  it('belongs to the current user', async () => {
    const body = MesocycleDetailSchema.parse(await (await create({ name: 'Mine' })).json());
    const row = await prisma.mesocycle.findUniqueOrThrow({ where: { id: body.id } });
    expect(row.userId).toBe(await devUserId());
  });

  it.each([
    ['blank name', { name: ' ' }],
    ['zero days', { days_per_week: 0, schedule_mode: 'relative' }],
    ['more than 10 days', { days_per_week: 11, schedule_mode: 'relative' }],
    ['weekday names without 7 days', { days_per_week: 5 }],
    ['duration too short', { duration_weeks: 3 }],
    ['duration too long', { duration_weeks: 7 }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await create(body);
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/mesocycles', () => {
  it('lists only the current user mesocycles as summaries, newest activity first', async () => {
    await create({ name: 'First', days_per_week: 3, schedule_mode: 'relative' });
    await create({ name: 'Second', days_per_week: 5, schedule_mode: 'relative' });
    await prisma.mesocycle.create({
      data: { userId: await otherUserId(), name: 'Not mine', daysPerWeek: 3 },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const { items } = MesocycleListSchema.parse(await response.json());
    expect(items.map((i) => i.name)).toEqual(['Second', 'First']);
    expect(items.map((i) => i.day_count)).toEqual([5, 3]);
    expect(items[0]).not.toHaveProperty('days');
  });

  it('returns an empty list when there are none', async () => {
    expect(await (await GET()).json()).toEqual({ items: [] });
  });
});
