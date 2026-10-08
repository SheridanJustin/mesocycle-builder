-- Profile avatar (SPEC decision 22): an icon and a color chosen on the settings page.
ALTER TABLE "users" ADD COLUMN "avatar_icon" VARCHAR(32) NOT NULL DEFAULT 'initial';
ALTER TABLE "users" ADD COLUMN "avatar_color" VARCHAR(16) NOT NULL DEFAULT 'aqua';
