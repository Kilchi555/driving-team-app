-- Ad-level daily performance table for Meta Ads creative analysis.
-- Enables comparison of individual ads (different visuals, headlines, body texts)
-- within the same adset to identify winning creatives.

CREATE TABLE IF NOT EXISTS marketing_meta_ads_ad_daily (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT NOT NULL,
  adset_id        TEXT NOT NULL,
  adset_name      TEXT NOT NULL,
  ad_id           TEXT NOT NULL,
  ad_name         TEXT NOT NULL,

  -- Performance metrics
  spend           NUMERIC(10,2) NOT NULL DEFAULT 0,
  impressions     INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  reach           INTEGER NOT NULL DEFAULT 0,
  actions         JSONB,

  -- Creative content (fetched from ad creative endpoint)
  creative_id     TEXT,
  headline        TEXT,      -- primary headline / title
  body            TEXT,      -- primary text
  description     TEXT,      -- link description
  image_hash      TEXT,      -- image identifier
  video_id        TEXT,      -- video identifier
  call_to_action  TEXT,      -- e.g. LEARN_MORE, SIGN_UP

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (date, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_ad_daily_tenant_date
  ON marketing_meta_ads_ad_daily (tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_meta_ads_ad_daily_campaign
  ON marketing_meta_ads_ad_daily (campaign_id, date DESC);

COMMENT ON TABLE marketing_meta_ads_ad_daily IS
  'Daily ad-level Meta Ads performance with creative content for A/B analysis.';
