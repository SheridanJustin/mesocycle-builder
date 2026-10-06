import {
  CreateExerciseSchema,
  ExerciseListSchema,
  ExerciseSchema,
  ListExercisesQuerySchema,
} from '@mesocycle/shared';
import { Prisma } from '@prisma/client';
import { ApiRouteError, handle, jsonResponse, parseJsonBody } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { prisma } from '../../../../lib/db';
import { decodeCursor, encodeCursor, toExerciseDto } from '../../../../lib/exercises';

export const dynamic = 'force-dynamic';

// GET /api/v1/exercises: global catalog plus the current user's custom exercises.
export function GET(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const query = ListExercisesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

    const where: Prisma.ExerciseWhereInput = {
      AND: [
        { OR: [{ userId: null }, { userId: user.id }] },
        ...(query.primary_muscle ? [{ primaryMuscle: query.primary_muscle }] : []),
        ...(query.equipment ? [{ equipmentType: query.equipment }] : []),
        ...(query.movement_type ? [{ movementType: query.movement_type }] : []),
        ...(query.search ? [{ name: { contains: query.search, mode: 'insensitive' as const } }] : []),
        ...(cursor
          ? [{ OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] }]
          : []),
      ],
    };

    const rows = await prisma.exercise.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    const next_cursor = rows.length > query.limit && last ? encodeCursor({ name: last.name, id: last.id }) : null;

    return jsonResponse(ExerciseListSchema, { items: page.map(toExerciseDto), next_cursor });
  });
}

// POST /api/v1/exercises: create a custom exercise. 409 if the user already has that name.
export function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const body = await parseJsonBody(request, CreateExerciseSchema);

    const duplicate = await prisma.exercise.findFirst({
      where: { userId: user.id, name: { equals: body.name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) throw new ApiRouteError('CONFLICT', `You already have an exercise named "${body.name}"`);

    try {
      const created = await prisma.exercise.create({
        data: {
          name: body.name,
          primaryMuscle: body.primary_muscle,
          secondaryMuscles: body.secondary_muscles,
          equipmentType: body.equipment_type,
          movementType: body.movement_type,
          isCustom: true,
          userId: user.id,
        },
      });
      return jsonResponse(ExerciseSchema, toExerciseDto(created), 201);
    } catch (error) {
      // Lost a race with a concurrent create of the same name.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiRouteError('CONFLICT', `You already have an exercise named "${body.name}"`);
      }
      throw error;
    }
  });
}
