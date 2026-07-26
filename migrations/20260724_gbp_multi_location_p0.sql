-- P0: GBP multi-location + automation settings foundation
-- Tenant → 1 OAuth connection → n locations
-- Settings: tenant defaults (location_id NULL) + optional location overrides

-- ─── gbp_locations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gbp_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES tenant_google_connections(id) ON DELETE CASCADE,
  gbp_account_name text NOT NULL,
  gbp_location_id text NOT NULL,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, gbp_location_id)
);

CREATE INDEX IF NOT EXISTS idx_gbp_locations_tenant ON gbp_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gbp_locations_connection ON gbp_locations(connection_id);

ALTER TABLE gbp_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_locations_tenant_isolation ON gbp_locations;
CREATE POLICY gbp_locations_tenant_isolation ON gbp_locations
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));

-- ─── gbp_automation_settings ─────────────────────────────────────────────────
-- location_id NULL = tenant-wide defaults
-- location_id set = override for that location
CREATE TABLE IF NOT EXISTS gbp_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES gbp_locations(id) ON DELETE CASCADE,
  review_reply_mode text NOT NULL DEFAULT 'suggest'
    CHECK (review_reply_mode IN ('off', 'suggest', 'auto_ge_4', 'auto_all')),
  posts_per_week integer NOT NULL DEFAULT 2
    CHECK (posts_per_week BETWEEN 1 AND 4),
  photo_mode text NOT NULL DEFAULT 'off'
    CHECK (photo_mode IN ('off', 'approved_only', 'pool_auto')),
  brand_voice text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_cta_type text,
  default_cta_url text,
  timezone text NOT NULL DEFAULT 'Europe/Zurich',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One tenant-default row (location_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS gbp_automation_settings_tenant_default_uidx
  ON gbp_automation_settings (tenant_id)
  WHERE location_id IS NULL;

-- One override row per location
CREATE UNIQUE INDEX IF NOT EXISTS gbp_automation_settings_location_uidx
  ON gbp_automation_settings (location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gbp_automation_settings_tenant ON gbp_automation_settings(tenant_id);

ALTER TABLE gbp_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_automation_settings_tenant_isolation ON gbp_automation_settings;
CREATE POLICY gbp_automation_settings_tenant_isolation ON gbp_automation_settings
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));

-- ─── Extend gbp_scheduled_posts ──────────────────────────────────────────────
ALTER TABLE gbp_scheduled_posts
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES gbp_locations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS language_code text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Add source check only if not present (idempotent-ish)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gbp_scheduled_posts_source_check'
  ) THEN
    ALTER TABLE gbp_scheduled_posts
      ADD CONSTRAINT gbp_scheduled_posts_source_check
      CHECK (source IN ('manual', 'ai', 'system'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gbp_scheduled_posts_location ON gbp_scheduled_posts(location_id);
CREATE INDEX IF NOT EXISTS idx_gbp_scheduled_posts_status_scheduled
  ON gbp_scheduled_posts(status, scheduled_for)
  WHERE status = 'scheduled';

ALTER TABLE gbp_scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_scheduled_posts_tenant_isolation ON gbp_scheduled_posts;
CREATE POLICY gbp_scheduled_posts_tenant_isolation ON gbp_scheduled_posts
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));


-- ─── Backfill locations from existing connections ────────────────────────────
INSERT INTO gbp_locations (
  tenant_id,
  connection_id,
  gbp_account_name,
  gbp_location_id,
  title,
  is_active
)
SELECT
  c.tenant_id,
  c.id,
  c.gbp_account_name,
  c.gbp_location_id,
  c.gbp_location_name,
  true
FROM tenant_google_connections c
WHERE c.gbp_location_id IS NOT NULL
  AND c.gbp_account_name IS NOT NULL
ON CONFLICT (tenant_id, gbp_location_id) DO NOTHING;

-- Tenant default settings for every tenant that has a GBP connection
INSERT INTO gbp_automation_settings (tenant_id, location_id, review_reply_mode, posts_per_week, photo_mode)
SELECT c.tenant_id, NULL, 'suggest', 2, 'off'
FROM tenant_google_connections c
ON CONFLICT DO NOTHING;

-- Attach location_id on any existing scheduled posts via tenant's first location
UPDATE gbp_scheduled_posts sp
SET location_id = loc.id
FROM gbp_locations loc
WHERE sp.location_id IS NULL
  AND loc.tenant_id = sp.tenant_id
  AND loc.is_active = true;
