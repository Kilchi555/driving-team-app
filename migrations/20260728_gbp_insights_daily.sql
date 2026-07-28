-- Daily GBP performance metrics (historized from Google Performance API)
CREATE TABLE IF NOT EXISTS gbp_insights_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES gbp_locations(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  metric text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, metric_date, metric)
);

CREATE INDEX IF NOT EXISTS idx_gbp_insights_daily_tenant_date
  ON gbp_insights_daily (tenant_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_gbp_insights_daily_location_date
  ON gbp_insights_daily (location_id, metric_date DESC);

ALTER TABLE gbp_insights_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_insights_daily_tenant_isolation ON gbp_insights_daily;
CREATE POLICY gbp_insights_daily_tenant_isolation ON gbp_insights_daily
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));
