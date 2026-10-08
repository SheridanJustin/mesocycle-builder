-- Appearance preferences: a color palette and a light or dark mode.
ALTER TABLE "users" ADD COLUMN "palette" VARCHAR(32) NOT NULL DEFAULT 'graphite';
ALTER TABLE "users" ADD COLUMN "color_mode" VARCHAR(8) NOT NULL DEFAULT 'dark';
ALTER TABLE "users" ADD CONSTRAINT "users_color_mode_check" CHECK ("color_mode" IN ('dark', 'light'));
