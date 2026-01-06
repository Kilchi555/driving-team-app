-- Migration: Extend voucher_codes to support discount codes (not just credit)
-- This consolidates promo codes into one table: credit-based OR discount-based

-- First, ensure voucher_codes table exists with all base columns
CREATE TABLE IF NOT EXISTS voucher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code identification
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Credit amount (for legacy credit codes)
  credit_amount_rappen INTEGER,
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Usage limits
  max_redemptions INTEGER DEFAULT 1,
  current_redemptions INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_voucher_codes_code ON voucher_codes(code);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_tenant_id ON voucher_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_is_active ON voucher_codes(is_active);

-- Now ALTER TABLE voucher_codes to support discount codes
ALTER TABLE voucher_codes 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'credit' CHECK (type IN ('credit', 'discount')),
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS discount_value INTEGER,
ADD COLUMN IF NOT EXISTS min_amount_rappen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_discount_rappen INTEGER,
ADD COLUMN IF NOT EXISTS allowed_categories TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_usage_per_user INTEGER,
ADD COLUMN IF NOT EXISTS usage_count_per_user JSONB DEFAULT '{}'::jsonb;

-- Add comment for new columns
COMMENT ON COLUMN voucher_codes.type IS 'Type of code: credit (adds credit), discount (reduces price)';
COMMENT ON COLUMN voucher_codes.discount_type IS 'For discount codes: percentage or fixed amount';
COMMENT ON COLUMN voucher_codes.discount_value IS 'Discount value: percentage (1-100) or fixed amount in rappen';
COMMENT ON COLUMN voucher_codes.max_discount_rappen IS 'Maximum discount cap in rappen (for percentage discounts)';
COMMENT ON COLUMN voucher_codes.allowed_categories IS 'Null = all categories, Array of category codes to restrict to';
COMMENT ON COLUMN voucher_codes.max_usage_per_user IS 'How many times this code can be used per user';
COMMENT ON COLUMN voucher_codes.usage_count_per_user IS 'JSONB tracking: {"user_id": usage_count}';

-- Create index for per-user tracking
CREATE INDEX IF NOT EXISTS idx_voucher_codes_type ON voucher_codes(type);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_is_active_type ON voucher_codes(is_active, type);

-- Create redemption tracking table
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code_id UUID NOT NULL REFERENCES voucher_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- What was redeemed
  discount_amount_rappen INTEGER NOT NULL,
  credit_amount_rappen INTEGER DEFAULT 0,
  
  -- When
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_code_id ON voucher_redemptions(voucher_code_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_id ON voucher_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_appointment_id ON voucher_redemptions(appointment_id);

-- Enable RLS
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "customer_read_own_redemptions" ON voucher_redemptions;
DROP POLICY IF EXISTS "staff_read_tenant_redemptions" ON voucher_redemptions;
DROP POLICY IF EXISTS "service_role_all_redemptions" ON voucher_redemptions;

-- Policies
CREATE POLICY "customer_read_own_redemptions" ON voucher_redemptions
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "staff_read_tenant_redemptions" ON voucher_redemptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role = ANY(ARRAY['staff'::text, 'admin'::text, 'tenant_admin'::text])
        AND is_active = true
      )
    )
  );

CREATE POLICY "service_role_all_redemptions" ON voucher_redemptions
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

