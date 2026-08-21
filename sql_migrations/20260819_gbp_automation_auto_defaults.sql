-- New GBP automation defaults: publish everything automatically.
ALTER TABLE gbp_automation_settings
  ALTER COLUMN review_reply_mode SET DEFAULT 'auto_all';

ALTER TABLE gbp_automation_settings
  ALTER COLUMN photo_mode SET DEFAULT 'approved_only';

ALTER TABLE gbp_automation_settings
  ALTER COLUMN post_mode SET DEFAULT 'calendar';
