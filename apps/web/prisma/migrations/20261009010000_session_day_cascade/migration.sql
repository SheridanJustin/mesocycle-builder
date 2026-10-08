-- Deleting a mesocycle removes its days and weeks in one statement; a workout session must not
-- block the day delete (it is removed with its week anyway).
ALTER TABLE "workout_sessions" DROP CONSTRAINT "workout_sessions_day_id_fkey";
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "mesocycle_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
