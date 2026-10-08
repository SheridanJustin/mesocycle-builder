-- The list page can be reordered by dragging; lower positions come first.
ALTER TABLE "mesocycles" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Keep the order users already see: most recently edited first.
UPDATE "mesocycles" AS m
SET "position" = ranked.rn
FROM (
  SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "updated_at" DESC, "id") - 1)::INTEGER AS rn
  FROM "mesocycles"
) AS ranked
WHERE m."id" = ranked."id";
