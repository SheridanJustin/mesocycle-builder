import { MUSCLES } from '@mesocycle/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/db';
import { seedCatalog } from './seed-lib';
import { EXERCISE_SEEDS } from './seed-data/exercises';

afterAll(() => prisma.$disconnect());

describe('seedCatalog', () => {
  it('is idempotent: re-running changes neither row counts nor ids', async () => {
    await seedCatalog(prisma);
    const before = await prisma.exercise.findMany({ where: { userId: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    const landmarksBefore = await prisma.muscleLandmark.count();

    await seedCatalog(prisma);
    await seedCatalog(prisma);

    const after = await prisma.exercise.findMany({ where: { userId: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    expect(after).toEqual(before);
    expect(after).toHaveLength(EXERCISE_SEEDS.length);
    expect(await prisma.muscleLandmark.count()).toBe(landmarksBefore);
    expect(landmarksBefore).toBe(MUSCLES.length);
  });

  it('restores edited seed rows on re-run', async () => {
    await prisma.muscleLandmark.update({ where: { muscle: 'chest' }, data: { mrv: 99 } });
    await prisma.exercise.updateMany({ where: { userId: null, name: 'Cable Fly' }, data: { equipmentType: 'machine' } });

    await seedCatalog(prisma);

    expect((await prisma.muscleLandmark.findUniqueOrThrow({ where: { muscle: 'chest' } })).mrv).toBe(22);
    expect((await prisma.exercise.findFirstOrThrow({ where: { userId: null, name: 'Cable Fly' } })).equipmentType).toBe('cable');
  });
});
