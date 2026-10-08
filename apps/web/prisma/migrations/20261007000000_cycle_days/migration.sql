-- A mesocycle's repeating cycle is now 1-10 days (7 by default). Days without exercises are rest days.
ALTER TABLE "mesocycles" DROP CONSTRAINT "mesocycles_days_check";
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_days_check" CHECK ("days_per_week" BETWEEN 1 AND 10);
ALTER TABLE "mesocycles" ALTER COLUMN "days_per_week" SET DEFAULT 7;
ALTER TABLE "mesocycles" ALTER COLUMN "schedule_mode" SET DEFAULT 'calendar';

ALTER TABLE "mesocycle_days" DROP CONSTRAINT "mesocycle_days_day_number_check";
ALTER TABLE "mesocycle_days" ADD CONSTRAINT "mesocycle_days_day_number_check" CHECK ("day_number" BETWEEN 1 AND 10);
