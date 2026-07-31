-- Recurring / scheduled marketing campaigns
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS schedule_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_frequency text,
  ADD COLUMN IF NOT EXISTS schedule_day_of_week smallint,
  ADD COLUMN IF NOT EXISTS schedule_hour smallint NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS schedule_batch_size integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

ALTER TABLE email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_schedule_frequency_check;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_schedule_frequency_check
  CHECK (schedule_frequency IS NULL OR schedule_frequency IN ('daily', 'weekly'));

ALTER TABLE email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_schedule_dow_check;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_schedule_dow_check
  CHECK (schedule_day_of_week IS NULL OR (schedule_day_of_week BETWEEN 1 AND 7));

ALTER TABLE email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_schedule_hour_check;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_schedule_hour_check
  CHECK (schedule_hour BETWEEN 0 AND 23);

COMMENT ON COLUMN email_campaigns.schedule_frequency IS 'daily | weekly — recurring auto-send cadence';
COMMENT ON COLUMN email_campaigns.schedule_day_of_week IS 'ISO weekday 1=Mon … 7=Sun (weekly only)';
COMMENT ON COLUMN email_campaigns.schedule_hour IS 'Hour 0–23 in Europe/Zurich';
COMMENT ON COLUMN email_campaigns.schedule_batch_size IS 'Max leads queued per automatic run';

CREATE INDEX IF NOT EXISTS idx_email_campaigns_schedule_due
  ON email_campaigns (schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_hour)
  WHERE schedule_enabled = true;
