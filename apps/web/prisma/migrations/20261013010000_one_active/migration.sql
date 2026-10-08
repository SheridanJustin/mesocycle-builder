-- Only one active mesocycle per user. Existing extras are paused, keeping the most recently locked one active.
UPDATE "mesocycles" AS m
SET "status" = 'paused'
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "locked_at" DESC NULLS LAST, "id") AS rn
  FROM "mesocycles"
  WHERE "status" = 'active'
) AS ranked
WHERE m."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "mesocycles_one_active_per_user" ON "mesocycles" ("user_id") WHERE "status" = 'active';
