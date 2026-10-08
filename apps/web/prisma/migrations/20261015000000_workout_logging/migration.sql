-- Workout logging (SPEC decision 19): one logged row per set, and an index for exercise history.
CREATE UNIQUE INDEX "logged_sets_session_exercise_id_set_number_key" ON "logged_sets"("session_exercise_id", "set_number");

CREATE INDEX "session_exercises_exercise_id_idx" ON "session_exercises"("exercise_id");
