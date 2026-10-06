import { MUSCLES, MuscleLandmarkListSchema } from '@mesocycle/shared';
import { handle, jsonResponse } from '../../../../lib/api';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/v1/muscle-landmarks: every landmark row, in canonical muscle order.
export function GET() {
  return handle(async () => {
    const rows = await prisma.muscleLandmark.findMany();
    const order = new Map(MUSCLES.map((muscle, index) => [muscle, index]));
    const items = rows
      .map((row) => ({
        muscle: row.muscle,
        mv: row.mv,
        mev: row.mev,
        mav_low: row.mavLow,
        mav_high: row.mavHigh,
        mrv: row.mrv,
      }))
      .sort((a, b) => (order.get(a.muscle) ?? 0) - (order.get(b.muscle) ?? 0));
    return jsonResponse(MuscleLandmarkListSchema, { items });
  });
}
