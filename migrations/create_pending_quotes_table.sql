-- Create pending_quotes table for fraud prevention
-- Quotes expire after 5 minutes and are deleted daily

CREATE TABLE IF NOT EXISTS pending_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Price breakdown
  base_price_rappen INTEGER NOT NULL,
  admin_fee_rappen INTEGER NOT NULL,
  products_price_rappen INTEGER NOT NULL,
  discount_amount_rappen INTEGER NOT NULL DEFAULT 0,
  
  -- Voucher/Discount code information (server-validated)
  voucher_code TEXT,
  voucher_discount_rappen INTEGER NOT NULL DEFAULT 0,
  total_discount_rappen INTEGER NOT NULL,
  
  -- Final calculated amount
  total_amount_before_credit_rappen INTEGER NOT NULL,
  
  -- Link to appointment (optional)
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_pending_quotes_user_id ON pending_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_quotes_tenant_id ON pending_quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_quotes_expires_at ON pending_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_quotes_appointment_id ON pending_quotes(appointment_id);

-- Enable RLS
ALTER TABLE pending_quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "customer_read_own_quotes" ON pending_quotes;
DROP POLICY IF EXISTS "customer_update_own_quotes" ON pending_quotes;
DROP POLICY IF EXISTS "service_role_all_quotes" ON pending_quotes;
DROP POLICY IF EXISTS "staff_read_tenant_quotes" ON pending_quotes;
DROP POLICY IF EXISTS "admin_read_tenant_quotes" ON pending_quotes;

-- Policies
CREATE POLICY "customer_read_own_quotes" ON pending_quotes
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "customer_update_own_quotes" ON pending_quotes
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Staff can read quotes for their tenant
CREATE POLICY "staff_read_tenant_quotes" ON pending_quotes
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = ANY(ARRAY['staff'::text, 'admin'::text, 'tenant_admin'::text])
      AND is_active = true
    )
  );

-- Service role unrestricted
CREATE POLICY "service_role_all_quotes" ON pending_quotes
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

