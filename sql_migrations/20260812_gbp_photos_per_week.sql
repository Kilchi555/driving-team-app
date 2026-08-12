-- GBP photo automation: configurable weekly cadence (default 2/week, matching posts)
ALTER TABLE gbp_automation_settings
  ADD COLUMN IF NOT EXISTS photos_per_week integer NOT NULL DEFAULT 2;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gbp_automation_settings_photos_per_week_check'
  ) THEN
    ALTER TABLE gbp_automation_settings
      ADD CONSTRAINT gbp_automation_settings_photos_per_week_check
      CHECK (photos_per_week BETWEEN 1 AND 7);
  END IF;
END $$;

COMMENT ON COLUMN gbp_automation_settings.photos_per_week IS
  'Max approved pool photos to publish per location per calendar week (tenant timezone)';
