-- Display preference: some lifters do not track RIR.
ALTER TABLE "users" ADD COLUMN "show_rir" BOOLEAN NOT NULL DEFAULT true;
