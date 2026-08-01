-- Campaign automation: how often the same lead may receive this campaign again.
-- once  = never re-mail a lead who already got this campaign (new leads still eligible)
-- repeat = re-mail after schedule_repeat_interval_days (e.g. 30 ≈ monthly)

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS schedule_repeat_mode text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS schedule_repeat_interval_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_schedule_repeat_mode_check;

ALTER TABLE public.email_campaigns
  ADD CONSTRAINT email_campaigns_schedule_repeat_mode_check
  CHECK (schedule_repeat_mode IN ('once', 'repeat'));

ALTER TABLE public.email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_schedule_repeat_interval_check;

ALTER TABLE public.email_campaigns
  ADD CONSTRAINT email_campaigns_schedule_repeat_interval_check
  CHECK (schedule_repeat_interval_days >= 1 AND schedule_repeat_interval_days <= 365);

COMMENT ON COLUMN public.email_campaigns.schedule_repeat_mode IS
  'once = each lead at most once; repeat = again after schedule_repeat_interval_days';
COMMENT ON COLUMN public.email_campaigns.schedule_repeat_interval_days IS
  'Minimum days before the same lead may receive this campaign again (repeat mode only)';
