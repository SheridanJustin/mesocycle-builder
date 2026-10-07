-- Active mesocycles can be dropped; completed and dropped ones form the archive.
ALTER TYPE "MesocycleStatus" ADD VALUE 'dropped';
ALTER TABLE "mesocycles" ADD COLUMN "ended_at" TIMESTAMP(3);
