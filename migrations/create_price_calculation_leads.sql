-- Table to store price calculator leads from the drivingteam.ch website
-- Used for follow-up with potential customers who requested a price calculation

CREATE TABLE IF NOT EXISTS price_calculation_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Customer contact
  first_name VARCHAR,
  email VARCHAR NOT NULL,

  -- Calculation details
  category VARCHAR NOT NULL,
  lessons_count INTEGER NOT NULL,
  total_cost INTEGER NOT NULL,
  calculation_details TEXT,

  -- Follow-up tracking
  followed_up_at TIMESTAMP,
  follow_up_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_price_leads_tenant_id ON price_calculation_leads(tenant_id);
CREATE INDEX idx_price_leads_email ON price_calculation_leads(email);
CREATE INDEX idx_price_leads_created_at ON price_calculation_leads(created_at DESC);
CREATE INDEX idx_price_leads_followed_up ON price_calculation_leads(followed_up_at) WHERE followed_up_at IS NULL;

-- RLS: only staff/admin of the tenant can read leads
ALTER TABLE price_calculation_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their tenant's price leads"
  ON price_calculation_leads FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff can update their tenant's price leads"
  ON price_calculation_leads FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- Service role can insert (used by the website server API)
CREATE POLICY "Service role can insert price leads"
  ON price_calculation_leads FOR INSERT
  WITH CHECK (true);
