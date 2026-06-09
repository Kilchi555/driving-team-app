-- Migration: Meta Conversions API (CAPI) infrastructure + Ad Set Level Sync
-- Sprint 1+2+3 — Meta Ads full integration
-- Applied via Supabase MCP on 2026-06-09

-- ============================================================
-- 1. Add Meta attribution columns to marketing_attributions
-- ============================================================
ALTER TABLE marketing_attributions
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS fbc   TEXT,
  ADD COLUMN IF NOT EXISTS fbp   TEXT;

COMMENT ON COLUMN marketing_attributions.fbclid IS 'Meta click ID from ?fbclid= URL param';
COMMENT ON COLUMN marketing_attributions.fbc    IS 'Meta _fbc cookie (fb.1.{ts}.{fbclid}) for CAPI deduplication';
COMMENT ON COLUMN marketing_attributions.fbp    IS 'Meta _fbp browser ID cookie (fb.1.{ts}.{random}) for audience matching';

-- ============================================================
-- 2. Add Meta attribution columns to appointments
-- ============================================================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS fbc   TEXT,
  ADD COLUMN IF NOT EXISTS fbp   TEXT;

COMMENT ON COLUMN appointments.fbclid IS 'Meta click ID from ?fbclid= URL param when booking originated from a Meta ad';
COMMENT ON COLUMN appointments.fbc    IS 'Meta _fbc cookie for CAPI deduplication at time of booking';
COMMENT ON COLUMN appointments.fbp    IS 'Meta _fbp browser ID cookie for CAPI audience matching';

CREATE INDEX IF NOT EXISTS idx_appointments_fbclid ON appointments(fbclid) WHERE fbclid IS NOT NULL;

-- ============================================================
-- 3. Create meta_capi_uploads audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_capi_uploads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id             UUID REFERENCES tenants(id) ON DELETE SET NULL,
  pixel_id              TEXT NOT NULL,
  event_name            TEXT NOT NULL,
  fbclid                TEXT,
  fbc                   TEXT,
  fbp                   TEXT,
  conversion_value_chf  NUMERIC(10, 2) NOT NULL,
  conversion_date_time  TIMESTAMPTZ NOT NULL,
  upload_status         TEXT NOT NULL DEFAULT 'pending',
  upload_attempts       INTEGER NOT NULL DEFAULT 0,
  last_attempt_at       TIMESTAMPTZ,
  error_message         TEXT,
  meta_response         JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_capi_appointment ON meta_capi_uploads(appointment_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_tenant      ON meta_capi_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_status      ON meta_capi_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_meta_capi_event_name  ON meta_capi_uploads(event_name);

ALTER TABLE meta_capi_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON meta_capi_uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Meta ad account → tenant mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_meta_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ad_account_id  TEXT NOT NULL UNIQUE,
  pixel_id       TEXT,
  label          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE marketing_meta_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON marketing_meta_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed: Driving Team ad account mapping
INSERT INTO marketing_meta_accounts (tenant_id, ad_account_id, pixel_id, label, is_active)
VALUES (
  '64259d68-195a-4c68-8875-f1b44d962830',
  'act_112579503417059',
  '1523803071276836',
  'Fahrschule Driving Team',
  true
) ON CONFLICT (ad_account_id) DO NOTHING;

-- ============================================================
-- 5. Add tenant_id to marketing_meta_ads_daily (Sprint 3)
-- ============================================================
ALTER TABLE marketing_meta_ads_daily
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meta_ads_tenant      ON marketing_meta_ads_daily(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_ads_tenant_date ON marketing_meta_ads_daily(tenant_id, date DESC) WHERE tenant_id IS NOT NULL;

-- ============================================================
-- 6. Create marketing_meta_adsets_daily (Sprint 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_meta_adsets_daily (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  date          DATE NOT NULL,
  campaign_id   TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT '',
  adset_id      TEXT NOT NULL,
  adset_name    TEXT NOT NULL DEFAULT '',
  spend         NUMERIC(10,2) NOT NULL DEFAULT 0,
  impressions   INT NOT NULL DEFAULT 0,
  clicks        INT NOT NULL DEFAULT 0,
  reach         INT NOT NULL DEFAULT 0,
  actions       JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, adset_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_adsets_tenant      ON marketing_meta_adsets_daily(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_adsets_tenant_date ON marketing_meta_adsets_daily(tenant_id, date DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meta_adsets_campaign    ON marketing_meta_adsets_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_date        ON marketing_meta_adsets_daily(date DESC);

ALTER TABLE marketing_meta_adsets_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON marketing_meta_adsets_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);
