-- Custom marketing-specific lead categories
-- These extend the existing categories/course_categories for marketing purposes
CREATE TABLE IF NOT EXISTS lead_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, code)
);

ALTER TABLE lead_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON lead_categories
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
