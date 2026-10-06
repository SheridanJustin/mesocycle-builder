import { MUSCLES, MuscleLandmarkListSchema } from '@mesocycle/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/db';
import { GET } from './route';

afterAll(() => prisma.$disconnect());

describe('GET /api/v1/muscle-landmarks', () => {
  it('returns one row per muscle in canonical order', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const { items } = MuscleLandmarkListSchema.parse(await response.json());
    expect(items.map((i) => i.muscle)).toEqual([...MUSCLES]);
  });

  it('returns the seeded values in snake_case', async () => {
    const { items } = MuscleLandmarkListSchema.parse(await (await GET()).json());
    expect(items.find((i) => i.muscle === 'chest')).toEqual({ muscle: 'chest', mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 });
  });
});

