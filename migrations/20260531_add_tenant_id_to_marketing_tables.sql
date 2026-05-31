-- Add tenant_id to all marketing/tracking tables for multi-tenant isolation.
-- Backfill with Driving Team tenant id (64259d68-195a-4c68-8875-f1b44d962830).

ALTER TABLE booking_redirects ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE booking_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE marketing_attributions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE google_ads_conversion_uploads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE marketing_ga4_daily ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE marketing_google_ads_daily ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE marketing_gsc_daily ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Backfill existing rows
UPDATE booking_redirects SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE booking_events SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE marketing_attributions SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE google_ads_conversion_uploads SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE marketing_ga4_daily SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE marketing_google_ads_daily SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;
UPDATE marketing_gsc_daily SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830' WHERE tenant_id IS NULL;

-- Update unique constraints to include tenant_id
ALTER TABLE marketing_ga4_daily DROP CONSTRAINT IF EXISTS marketing_ga4_daily_date_channel_page_path_key;
ALTER TABLE marketing_ga4_daily ADD CONSTRAINT marketing_ga4_daily_tenant_date_channel_page_key
  UNIQUE (tenant_id, date, channel, page_path);

ALTER TABLE marketing_google_ads_daily DROP CONSTRAINT IF EXISTS marketing_google_ads_daily_date_campaign_id_key;
ALTER TABLE marketing_google_ads_daily ADD CONSTRAINT marketing_google_ads_daily_tenant_date_campaign_key
  UNIQUE (tenant_id, date, campaign_id);

ALTER TABLE marketing_gsc_daily DROP CONSTRAINT IF EXISTS marketing_gsc_daily_date_query_page_key;
ALTER TABLE marketing_gsc_daily ADD CONSTRAINT marketing_gsc_daily_tenant_date_query_page_key
  UNIQUE (tenant_id, date, query, page);

-- When onboarding new tenants:
-- 1. Set MARKETING_TENANT_ID env var in Vercel for cron jobs (simy app)
-- 2. Set NUXT_TENANT_ID env var in Vercel for the website deployment
-- 3. All new data will be automatically tagged with the correct tenant_id
