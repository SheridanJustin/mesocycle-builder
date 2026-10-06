import type { PrismaClient } from '@prisma/client';
import { EXERCISE_SEEDS } from './seed-data/exercises';
import { LANDMARK_SEEDS } from './seed-data/landmarks';

export async function seedLandmarks(prisma: PrismaClient): Promise<void> {
  for (const { muscle, ...values } of LANDMARK_SEEDS) {
    await prisma.muscleLandmark.upsert({ where: { muscle }, update: values, create: { muscle, ...values } });
  }
}

// (user_id, name) is unique, but Postgres treats NULLs as distinct, so global exercises
// (user_id NULL) are matched manually to keep re-runs idempotent.
export async function seedExercises(prisma: PrismaClient): Promise<void> {
  for (const exercise of EXERCISE_SEEDS) {
    const existing = await prisma.exercise.findFirst({ where: { userId: null, name: exercise.name }, select: { id: true } });
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data: exercise });
    } else {
      await prisma.exercise.create({ data: { ...exercise, isCustom: false, userId: null } });
    }
  }
}

export async function seedDevUser(prisma: PrismaClient, email: string): Promise<void> {
  await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
}

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  await seedLandmarks(prisma);
  await seedExercises(prisma);
}
