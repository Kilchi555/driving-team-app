-- GBP audit history: stores the result of each "Analyse" run (deterministic scores + AI recommendations)
CREATE TABLE IF NOT EXISTS gbp_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES gbp_locations(id) ON DELETE CASCADE,
  overall_score integer NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbp_audits_location_created
  ON gbp_audits (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gbp_audits_tenant_created
  ON gbp_audits (tenant_id, created_at DESC);

ALTER TABLE gbp_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_audits_tenant_isolation ON gbp_audits;
CREATE POLICY gbp_audits_tenant_isolation ON gbp_audits
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));
