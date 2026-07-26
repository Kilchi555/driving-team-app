-- P1: GBP review action audit + scheduled post status helpers

CREATE TABLE IF NOT EXISTS gbp_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES gbp_locations(id) ON DELETE CASCADE,
  google_review_id text NOT NULL,
  star_rating integer,
  reviewer_name text,
  review_comment text,
  mode text NOT NULL DEFAULT 'suggest'
    CHECK (mode IN ('off', 'suggest', 'auto_ge_4', 'auto_all')),
  suggested_reply text,
  published_reply text,
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'approved', 'published', 'skipped', 'failed')),
  error_message text,
  review_create_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, location_id, google_review_id)
);

CREATE INDEX IF NOT EXISTS idx_gbp_review_actions_tenant_status
  ON gbp_review_actions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_gbp_review_actions_location
  ON gbp_review_actions(location_id);

ALTER TABLE gbp_review_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gbp_review_actions_tenant_isolation ON gbp_review_actions;
CREATE POLICY gbp_review_actions_tenant_isolation ON gbp_review_actions
  FOR ALL
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()));
