-- Migration: Create vouchers table for purchased vouchers
-- Date: 2025-12-02
-- Description: Store purchased vouchers (gift cards) with recipient info

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Code identification
  code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Product information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Amount in rappen (CHF * 100)
  amount_rappen INTEGER NOT NULL,
  
  -- Recipient information
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  
  -- Buyer information
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  
  -- Payment reference
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_rappen > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_payment_id ON vouchers(payment_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_recipient_email ON vouchers(recipient_email);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own vouchers (as recipient or buyer)
CREATE POLICY "Users can view their own vouchers"
  ON vouchers FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE id IN (redeemed_by, (SELECT id FROM users WHERE email = recipient_email))
    )
    OR EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.id = vouchers.payment_id 
      AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Policy: Admins can view all vouchers of their tenant
CREATE POLICY "Admins can view all vouchers of their tenant"
  ON vouchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
      AND tenant_id = vouchers.tenant_id
    )
  );

-- Policy: Admins can manage vouchers
CREATE POLICY "Admins can manage vouchers"
  ON vouchers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = vouchers.tenant_id
    )
  );

