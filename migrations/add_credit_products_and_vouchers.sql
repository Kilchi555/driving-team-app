-- Migration: Add Credit Products and Voucher System
-- Description: Enable students to purchase credit packages (5er, 10er Abos) 
--              and redeem voucher codes for credit top-up

-- =====================================================
-- 1. EXTEND PRODUCTS TABLE FOR CREDIT PRODUCTS
-- =====================================================

-- Add columns to products table to support credit top-up products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_credit_product BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_amount_rappen INTEGER;

-- Add comment explaining the fields
COMMENT ON COLUMN products.is_credit_product IS 'True if this product adds credit to student balance instead of physical delivery';
COMMENT ON COLUMN products.credit_amount_rappen IS 'Amount of credit (in Rappen) to add to student balance when purchased';

-- =====================================================
-- 2. VOUCHER CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS voucher_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Code identification
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Credit amount
  credit_amount_rappen INTEGER NOT NULL,
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Usage limits
  max_redemptions INTEGER DEFAULT 1,
  current_redemptions INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id),
  
  -- Constraints
  CONSTRAINT valid_credit_amount CHECK (credit_amount_rappen > 0),
  CONSTRAINT valid_redemptions CHECK (max_redemptions > 0),
  CONSTRAINT current_not_exceed_max CHECK (current_redemptions <= max_redemptions)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_voucher_codes_code ON voucher_codes(code);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_tenant ON voucher_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_active ON voucher_codes(is_active) WHERE is_active = true;

-- Add RLS
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view active vouchers of their tenant
CREATE POLICY "Users can view active vouchers of their tenant"
  ON voucher_codes FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
    AND is_active = true
  );

-- Policy: Admins can manage all vouchers
CREATE POLICY "Admins can manage vouchers"
  ON voucher_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = voucher_codes.tenant_id
    )
  );

-- =====================================================
-- 3. VOUCHER REDEMPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  voucher_id UUID NOT NULL REFERENCES voucher_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  credit_transaction_id UUID REFERENCES credit_transactions(id),
  
  -- Redemption details
  credit_amount_rappen INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id),
  
  -- Constraints
  CONSTRAINT valid_redemption_amount CHECK (credit_amount_rappen > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user ON voucher_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_tenant ON voucher_redemptions(tenant_id);

-- Add RLS
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions"
  ON voucher_redemptions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Admins can view all redemptions in their tenant
CREATE POLICY "Admins can view tenant redemptions"
  ON voucher_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = voucher_redemptions.tenant_id
    )
  );

-- Policy: System can insert redemptions
CREATE POLICY "System can insert redemptions"
  ON voucher_redemptions FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. UPDATE CREDIT_TRANSACTIONS FOR NEW TYPES
-- =====================================================

-- Add new transaction types via constraint or comment
COMMENT ON COLUMN credit_transactions.transaction_type IS 
'Types: refund, cancellation, adjustment, manual, appointment_payment, purchase, voucher, withdrawal';

-- =====================================================
-- 5. CREATE SAMPLE CREDIT PRODUCTS
-- =====================================================

-- Insert sample 5er and 10er Abos (you can customize these)
-- Note: Adjust tenant_id to match your actual tenant

-- INSERT INTO products (
--   name,
--   description,
--   price_rappen,
--   is_credit_product,
--   credit_amount_rappen,
--   is_active,
--   category,
--   tenant_id
-- ) VALUES 
-- ('5er Abo', 'Paket mit 5 Fahrstunden - Guthaben wird automatisch gutgeschrieben', 45000, true, 47500, true, 'credit_packages', 'YOUR-TENANT-ID'),
-- ('10er Abo', 'Paket mit 10 Fahrstunden - Guthaben wird automatisch gutgeschrieben', 85000, true, 95000, true, 'credit_packages', 'YOUR-TENANT-ID'),
-- ('20er Abo', 'Paket mit 20 Fahrstunden - Guthaben wird automatisch gutgeschrieben', 160000, true, 190000, true, 'credit_packages', 'YOUR-TENANT-ID');

-- =====================================================
-- 6. FUNCTION: Auto-increment voucher redemptions
-- =====================================================

CREATE OR REPLACE FUNCTION increment_voucher_redemptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment current_redemptions counter
  UPDATE voucher_codes
  SET 
    current_redemptions = current_redemptions + 1,
    updated_at = NOW()
  WHERE id = NEW.voucher_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_increment_voucher_redemptions ON voucher_redemptions;
CREATE TRIGGER trigger_increment_voucher_redemptions
  AFTER INSERT ON voucher_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION increment_voucher_redemptions();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Summary:
-- ✅ Products table extended with is_credit_product and credit_amount_rappen
-- ✅ voucher_codes table created with validity and usage tracking
-- ✅ voucher_redemptions table created for redemption history
-- ✅ RLS policies added for security
-- ✅ Indexes added for performance
-- ✅ Trigger added for auto-incrementing redemption counter
-- ✅ Ready for credit product purchases and voucher redemptions

