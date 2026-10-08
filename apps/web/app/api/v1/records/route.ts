import { RecordsSchema } from '@mesocycle/shared';
import { handle, jsonResponse } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { loadRecords } from '../../../../lib/workouts';

export const dynamic = 'force-dynamic';

// GET /api/v1/records: personal bests per exercise from every logged set.
export function GET() {
  return handle(async () => jsonResponse(RecordsSchema, await loadRecords(await getCurrentUser())));
}
