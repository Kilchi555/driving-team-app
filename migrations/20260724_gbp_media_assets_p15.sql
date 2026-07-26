-- P1.5: GBP media asset pool for approved photo automation

CREATE TABLE IF NOT EXISTS gbp_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES gbp_locations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  category text NOT NULL DEFAULT 'INTERIOR'
    CHECK (category IN ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'LOGO', 'COVER')),
  approved boolean NOT NULL DEFAULT false,
  last_published_at timestamptz,
  publish_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'upload'
    CHECK (source IN ('upload', 'url', 'system')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_media_assets_tenant ON gbp_media_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gbp_media_assets_location ON gbp_media_assets(location_id);
CREATE INDEX IF NOT EXISTS idx_gbp_media_assets_approved
  ON gbp_media_assets(tenant_id, approved, last_published_at)
  WHERE approved = true;

ALTER TABLE gbp_media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_media_assets_tenant_isolation ON gbp_media_assets;
CREATE POLICY gbp_media_assets_tenant_isolation ON gbp_media_assets
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));
