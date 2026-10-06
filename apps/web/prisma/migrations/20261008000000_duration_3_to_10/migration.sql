-- A mesocycle now lasts 3-10 weeks (was 4-6).
ALTER TABLE "mesocycles" DROP CONSTRAINT "mesocycles_duration_check";
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_duration_check" CHECK ("duration_weeks" BETWEEN 3 AND 10);
