-- Align M0 migration with docs/SPEC.md section 5.
-- secondary_muscles must be NOT NULL (default '{}').
UPDATE "exercises" SET "secondary_muscles" = ARRAY[]::"Muscle"[] WHERE "secondary_muscles" IS NULL;
ALTER TABLE "exercises" ALTER COLUMN "secondary_muscles" SET NOT NULL;

-- updated_at on tables that are edited in place (Prisma @updatedAt keeps no DB default).
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "exercises" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "exercises" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "muscle_landmarks" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "muscle_landmarks" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "workout_sessions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "workout_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "logged_sets" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "logged_sets" ALTER COLUMN "updated_at" DROP DEFAULT;
