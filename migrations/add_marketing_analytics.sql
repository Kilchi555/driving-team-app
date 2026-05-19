-- Migration: Marketing Analytics – external platform data storage
-- Stores daily aggregated data from GA4, Google Search Console, Google Ads, and Meta Ads.
-- All tables use upsert-safe UNIQUE constraints so cron jobs can re-sync the last 3 days
-- without producing duplicate rows.

-- ============================================================
-- 1. GA4 – Daily traffic by channel and page
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_ga4_daily (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'unknown',
  page_path       TEXT NOT NULL DEFAULT '/',
  sessions        INT  NOT NULL DEFAULT 0,
  users           INT  NOT NULL DEFAULT 0,
  new_users       INT  NOT NULL DEFAULT 0,
  page_views      INT  NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  conversions     INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, channel, page_path)
);

COMMENT ON TABLE marketing_ga4_daily IS 'Daily GA4 sessions/users/conversions per channel and page, synced from Google Analytics Data API';

-- ============================================================
-- 2. Google Search Console – Daily queries
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_gsc_daily (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  query       TEXT NOT NULL,
  page        TEXT NOT NULL DEFAULT '/',
  clicks      INT  NOT NULL DEFAULT 0,
  impressions INT  NOT NULL DEFAULT 0,
  ctr         NUMERIC(6,5) NOT NULL DEFAULT 0,
  position    NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, query, page)
);

COMMENT ON TABLE marketing_gsc_daily IS 'Daily Search Console query performance (clicks, impressions, CTR, avg position), synced from Search Console API';

-- ============================================================
-- 3. Google Ads – Daily campaign performance
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_google_ads_daily (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE NOT NULL,
  campaign_id   TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT '',
  cost_micros   BIGINT NOT NULL DEFAULT 0,
  clicks        INT    NOT NULL DEFAULT 0,
  impressions   INT    NOT NULL DEFAULT 0,
  conversions   NUMERIC(10,2) NOT NULL DEFAULT 0,
  cpc_micros    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, campaign_id)
);

COMMENT ON TABLE marketing_google_ads_daily IS 'Daily Google Ads campaign spend/clicks/conversions (cost in micros = CHF * 1,000,000), synced from Google Ads API';

-- ============================================================
-- 4. Meta Ads – Daily campaign performance
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_meta_ads_daily (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE NOT NULL,
  campaign_id   TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT '',
  spend         NUMERIC(10,2) NOT NULL DEFAULT 0,
  impressions   INT  NOT NULL DEFAULT 0,
  clicks        INT  NOT NULL DEFAULT 0,
  reach         INT  NOT NULL DEFAULT 0,
  actions       JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, campaign_id)
);

COMMENT ON TABLE marketing_meta_ads_daily IS 'Daily Meta Ads campaign spend/reach/clicks/conversions, synced from Meta Marketing API. actions column stores raw conversion action breakdown as JSONB.';

-- ============================================================
-- Indexes for dashboard queries (date range lookups)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketing_ga4_date        ON marketing_ga4_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_gsc_date        ON marketing_gsc_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_google_ads_date ON marketing_google_ads_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_meta_ads_date   ON marketing_meta_ads_daily (date DESC);

-- updated_at trigger (reuse pattern from rest of DB if trigger function exists, else create inline)
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ga4_updated_at        BEFORE UPDATE ON marketing_ga4_daily        FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
  CREATE TRIGGER trg_gsc_updated_at        BEFORE UPDATE ON marketing_gsc_daily        FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
  CREATE TRIGGER trg_google_ads_updated_at BEFORE UPDATE ON marketing_google_ads_daily FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
  CREATE TRIGGER trg_meta_ads_updated_at   BEFORE UPDATE ON marketing_meta_ads_daily   FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
