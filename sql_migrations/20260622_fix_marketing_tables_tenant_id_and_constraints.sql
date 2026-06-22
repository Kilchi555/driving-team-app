-- ============================================================
-- Fix marketing tables: backfill null tenant_ids + unique constraints
--
-- Root cause: migration 20260531_add_tenant_id_to_marketing_tables.sql
-- contained a typo ("marketing_p_gsc_daily" instead of "marketing_gsc_daily"),
-- so the unique constraint was never added to the correct table.
-- Consequence: all upserts with onConflict 'tenant_id,...' failed silently
-- after May 31, causing GA4 and GSC syncs to stop.
--
-- This migration:
--   1. Backfills tenant_id = NULL rows to the Driving Team tenant
--   2. Drops all stale unique constraints (defensive, IF EXISTS)
--   3. Adds correct unique constraints that include tenant_id
--   4. Makes tenant_id NOT NULL to catch future issues early
-- ============================================================

-- ── 1. Backfill null tenant_ids ────────────────────────────────────────────

UPDATE marketing_ga4_daily
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

UPDATE marketing_gsc_daily
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

UPDATE marketing_google_ads_daily
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

UPDATE marketing_meta_ads_daily
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

-- ── 2. Fix unique constraint on marketing_gsc_daily ───────────────────────
-- Drop all possible old constraint names (defensive)
ALTER TABLE marketing_gsc_daily DROP CONSTRAINT IF EXISTS marketing_gsc_daily_date_query_page_key;
ALTER TABLE marketing_gsc_daily DROP CONSTRAINT IF EXISTS marketing_gsc_daily_tenant_date_query_page_key;
ALTER TABLE marketing_gsc_daily DROP CONSTRAINT IF EXISTS uq_gsc_tenant_date_query_page;

-- Add correct constraint (was missing due to typo in original migration)
ALTER TABLE marketing_gsc_daily
  ADD CONSTRAINT marketing_gsc_daily_tenant_date_query_page_key
  UNIQUE (tenant_id, date, query, page);

-- ── 3. Fix unique constraint on marketing_ga4_daily ───────────────────────
ALTER TABLE marketing_ga4_daily DROP CONSTRAINT IF EXISTS marketing_ga4_daily_date_channel_page_path_key;
ALTER TABLE marketing_ga4_daily DROP CONSTRAINT IF EXISTS marketing_ga4_daily_tenant_date_channel_page_path_key;
ALTER TABLE marketing_ga4_daily DROP CONSTRAINT IF EXISTS uq_ga4_tenant_date_channel_page_path;

ALTER TABLE marketing_ga4_daily
  ADD CONSTRAINT marketing_ga4_daily_tenant_date_channel_page_path_key
  UNIQUE (tenant_id, date, channel, page_path);

-- ── 4. Make tenant_id NOT NULL on all marketing tables ────────────────────
-- This makes future bugs visible immediately (loud failure) instead of
-- silently storing data that the report can't find.

ALTER TABLE marketing_ga4_daily
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE marketing_gsc_daily
  ALTER COLUMN tenant_id SET NOT NULL;

-- Note: marketing_google_ads_daily and marketing_meta_ads_daily already
-- seem to be writing correct tenant_ids. Add NOT NULL there too for safety.
ALTER TABLE marketing_google_ads_daily
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE marketing_meta_ads_daily
  ALTER COLUMN tenant_id SET NOT NULL;
