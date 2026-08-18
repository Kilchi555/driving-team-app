-- Yearly GBP post calendar (themes + copy), auto-published by cron.
-- post_mode: off | calendar

ALTER TABLE gbp_automation_settings
  ADD COLUMN IF NOT EXISTS post_mode text NOT NULL DEFAULT 'off';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gbp_automation_settings_post_mode_check'
  ) THEN
    ALTER TABLE gbp_automation_settings
      ADD CONSTRAINT gbp_automation_settings_post_mode_check
      CHECK (post_mode IN ('off', 'calendar'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS gbp_post_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES gbp_locations(id) ON DELETE CASCADE,
  year integer NOT NULL,
  planned_for timestamptz NOT NULL,
  theme_title text NOT NULL,
  theme_angle text,
  summary text NOT NULL DEFAULT '',
  topic_type text NOT NULL DEFAULT 'STANDARD'
    CHECK (topic_type IN ('STANDARD', 'EVENT', 'OFFER')),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'published', 'skipped', 'failed')),
  queue_priority integer NOT NULL DEFAULT 0,
  media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  gbp_post_name text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_post_calendar_loc_date
  ON gbp_post_calendar (tenant_id, location_id, planned_for);

CREATE INDEX IF NOT EXISTS idx_gbp_post_calendar_due
  ON gbp_post_calendar (status, planned_for)
  WHERE status IN ('planned', 'failed');

ALTER TABLE gbp_post_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_post_calendar_tenant_isolation ON gbp_post_calendar;
CREATE POLICY gbp_post_calendar_tenant_isolation ON gbp_post_calendar
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));

COMMENT ON TABLE gbp_post_calendar IS
  'AI yearly GBP post plan per location. Cron publishes due planned rows when post_mode=calendar.';
