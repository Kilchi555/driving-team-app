-- Add link_clicks (outbound_clicks) to all three Meta Ads tables.
-- Meta's generic `clicks` field counts ALL interactions (video plays, profile taps, reactions, etc.)
-- `outbound_clicks` counts only real link clicks that navigate to the destination URL.
-- This is the correct denominator for CTR, CPC, and LPV-Rate calculations.

ALTER TABLE marketing_meta_ads_daily
  ADD COLUMN IF NOT EXISTS link_clicks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE marketing_meta_adsets_daily
  ADD COLUMN IF NOT EXISTS link_clicks INTEGER NOT NULL DEFAULT 0;

ALTER TABLE marketing_meta_ads_ad_daily
  ADD COLUMN IF NOT EXISTS link_clicks INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN marketing_meta_ads_daily.link_clicks       IS 'Meta outbound_clicks: real link clicks to destination URL (excludes video plays, reactions, profile taps)';
COMMENT ON COLUMN marketing_meta_adsets_daily.link_clicks    IS 'Meta outbound_clicks: real link clicks to destination URL (excludes video plays, reactions, profile taps)';
COMMENT ON COLUMN marketing_meta_ads_ad_daily.link_clicks    IS 'Meta outbound_clicks: real link clicks to destination URL (excludes video plays, reactions, profile taps)';
