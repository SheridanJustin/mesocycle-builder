-- Accounts: email/password sign-up and Google sign-in.
ALTER TABLE "users" ADD COLUMN "name" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
