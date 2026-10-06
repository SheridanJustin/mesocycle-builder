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
  it('creates a draft with empty "Day N" days and defaults', async () => {
    const response = await create({ name: 'Fall Block', days_per_week: 4 });
    expect(response.status).toBe(201);
    const body = MesocycleDetailSchema.parse(await response.json());
    expect(body).toMatchObject({
      name: 'Fall Block',
      duration_weeks: 4,
      days_per_week: 4,
      schedule_mode: 'relative',
      status: 'draft',
      start_date: null,
      deload_final_week: false,
      priorities: [],
      volume_summary: { summary: {} },
    });
    expect(body.days.map((d) => d.day_name)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4']);
    expect(body.days.map((d) => d.sort_order)).toEqual([1, 2, 3, 4]);
    expect(body.days.every((d) => d.slots.length === 0 && d.muscle_groups.length === 0)).toBe(true);
  });

  it('honors duration_weeks and names calendar days after the given weekdays', async () => {
    const response = await create({
      name: 'MWF',
      days_per_week: 3,
      duration_weeks: 5,
      schedule_mode: 'calendar',
      weekdays: [4, 0, 2],
    });
    const body = MesocycleDetailSchema.parse(await response.json());
    expect(body.duration_weeks).toBe(5);
    expect(body.days.map((d) => [d.day_name, d.weekday])).toEqual([
      ['Mon', 0],
      ['Wed', 2],
      ['Fri', 4],
    ]);
  });

  it('belongs to the current user', async () => {
    const body = MesocycleDetailSchema.parse(await (await create({ name: 'Mine', days_per_week: 2 })).json());
    const row = await prisma.mesocycle.findUniqueOrThrow({ where: { id: body.id } });
    expect(row.userId).toBe(await devUserId());
  });

  it.each([
    ['blank name', { name: ' ', days_per_week: 4 }],
    ['too few days', { name: 'x', days_per_week: 1 }],
    ['too many days', { name: 'x', days_per_week: 7 }],
    ['duration too short', { name: 'x', days_per_week: 4, duration_weeks: 3 }],
    ['duration too long', { name: 'x', days_per_week: 4, duration_weeks: 7 }],
    ['weekdays in relative mode', { name: 'x', days_per_week: 2, weekdays: [0, 1] }],
    ['wrong weekday count', { name: 'x', days_per_week: 3, schedule_mode: 'calendar', weekdays: [0, 1] }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await create(body);
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/mesocycles', () => {
  it('lists only the current user mesocycles as summaries, newest activity first', async () => {
    await create({ name: 'First', days_per_week: 3 });
    await create({ name: 'Second', days_per_week: 5 });
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
