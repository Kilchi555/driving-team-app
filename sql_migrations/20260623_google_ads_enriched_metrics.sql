-- Migration: Google Ads – enriched metrics
-- Adds Impression Share + Conversion Value to campaign table,
-- Quality Score + Conversion Value to keywords table,
-- and creates a new search_terms table.

-- ============================================================
-- 1. Add Impression Share + Conversion Value to campaign table
-- ============================================================
ALTER TABLE marketing_google_ads_daily
  ADD COLUMN IF NOT EXISTS conversions_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impression_share     NUMERIC(6,4),   -- NULL = not applicable / <10%
  ADD COLUMN IF NOT EXISTS budget_lost_is       NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS rank_lost_is         NUMERIC(6,4);

COMMENT ON COLUMN marketing_google_ads_daily.conversions_value    IS 'Conversion value tracked by Google (CHF)';
COMMENT ON COLUMN marketing_google_ads_daily.impression_share     IS 'Search Impression Share (0–1). NULL when Google returns "--" (too low volume or budget)';
COMMENT ON COLUMN marketing_google_ads_daily.budget_lost_is       IS 'IS lost due to budget (0–1)';
COMMENT ON COLUMN marketing_google_ads_daily.rank_lost_is         IS 'IS lost due to rank/quality (0–1)';

-- ============================================================
-- 2. Add Quality Score + Conversion Value to keywords table
-- ============================================================
ALTER TABLE marketing_google_ads_keywords_daily
  ADD COLUMN IF NOT EXISTS conversions_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score      SMALLINT,     -- 1–10, NULL if not available
  ADD COLUMN IF NOT EXISTS post_click_quality TEXT,         -- ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE
  ADD COLUMN IF NOT EXISTS creative_quality   TEXT;         -- ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE

COMMENT ON COLUMN marketing_google_ads_keywords_daily.quality_score      IS 'Google Ads Quality Score (1–10). NULL when not enough data';
COMMENT ON COLUMN marketing_google_ads_keywords_daily.post_click_quality IS 'Landing page experience: ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE';
COMMENT ON COLUMN marketing_google_ads_keywords_daily.creative_quality   IS 'Ad relevance: ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE';

-- ============================================================
-- 3. Search Terms table (new)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_google_ads_search_terms_daily (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  date             DATE NOT NULL,
  campaign_id      TEXT NOT NULL,
  campaign_name    TEXT NOT NULL DEFAULT '',
  ad_group_id      TEXT NOT NULL DEFAULT '',
  ad_group_name    TEXT NOT NULL DEFAULT '',
  search_term      TEXT NOT NULL,
  match_type       TEXT NOT NULL DEFAULT '',   -- BROAD | PHRASE | EXACT (how it matched)
  keyword_text     TEXT NOT NULL DEFAULT '',   -- the triggering keyword
  cost_micros      BIGINT NOT NULL DEFAULT 0,
  clicks           INT    NOT NULL DEFAULT 0,
  impressions      INT    NOT NULL DEFAULT 0,
  conversions      NUMERIC(10,2) NOT NULL DEFAULT 0,
  conversions_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, date, campaign_id, ad_group_id, search_term)
);

CREATE INDEX IF NOT EXISTS idx_gads_search_terms_date
  ON marketing_google_ads_search_terms_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_gads_search_terms_tenant
  ON marketing_google_ads_search_terms_daily (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gads_search_terms_cost
  ON marketing_google_ads_search_terms_daily (cost_micros DESC);

COMMENT ON TABLE marketing_google_ads_search_terms_daily IS
  'Actual search queries that triggered Google Ads (search_term_view). Key for negative keyword analysis.';

DO $$ BEGIN
  CREATE TRIGGER trg_gads_search_terms_updated_at
    BEFORE UPDATE ON marketing_google_ads_search_terms_daily
    FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
