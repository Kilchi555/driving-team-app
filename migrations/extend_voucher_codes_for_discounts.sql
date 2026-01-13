-- Migration: Extend voucher_codes to support discount codes (not just credit)
-- This consolidates promo codes into one table: credit-based OR discount-based

-- ALTER TABLE voucher_codes to support discount codes
-- (Table should already exist from add_credit_products_and_vouchers.sql)
ALTER TABLE IF EXISTS public.voucher_codes 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'credit' CHECK (type IN ('credit', 'discount')),
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS discount_value INTEGER,
ADD COLUMN IF NOT EXISTS min_amount_rappen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_discount_rappen INTEGER,
ADD COLUMN IF NOT EXISTS allowed_categories TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_usage_per_user INTEGER,
ADD COLUMN IF NOT EXISTS usage_count_per_user JSONB DEFAULT '{}'::jsonb;

-- Add comment for new columns
COMMENT ON COLUMN public.voucher_codes.type IS 'Type of code: credit (adds credit), discount (reduces price)';
COMMENT ON COLUMN public.voucher_codes.discount_type IS 'For discount codes: percentage or fixed amount';
COMMENT ON COLUMN public.voucher_codes.discount_value IS 'Discount value: percentage (1-100) or fixed amount in rappen';
COMMENT ON COLUMN public.voucher_codes.max_discount_rappen IS 'Maximum discount cap in rappen (for percentage discounts)';
COMMENT ON COLUMN public.voucher_codes.allowed_categories IS 'Null = all categories, Array of category codes to restrict to';
COMMENT ON COLUMN public.voucher_codes.max_usage_per_user IS 'How many times this code can be used per user';
COMMENT ON COLUMN public.voucher_codes.usage_count_per_user IS 'JSONB tracking: {"user_id": usage_count}';

-- Create index for per-user tracking
CREATE INDEX IF NOT EXISTS idx_voucher_codes_type ON public.voucher_codes(type);
CREATE INDEX IF NOT EXISTS idx_voucher_codes_is_active_type ON public.voucher_codes(is_active, type);

-- EXTEND existing voucher_redemptions table to support discount tracking
-- Table already exists from previous migration, just add new columns
ALTER TABLE IF EXISTS public.voucher_redemptions
ADD COLUMN IF NOT EXISTS voucher_code_id UUID REFERENCES public.voucher_codes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS discount_amount_rappen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Add comment for new columns
COMMENT ON COLUMN public.voucher_redemptions.voucher_code_id IS 'Reference to voucher_codes.id (for discount tracking)';
COMMENT ON COLUMN public.voucher_redemptions.discount_amount_rappen IS 'Discount amount applied (for discount codes)';
COMMENT ON COLUMN public.voucher_redemptions.appointment_id IS 'Reference to the appointment this was redeemed for';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_code_id ON public.voucher_redemptions(voucher_code_id);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_appointment_id ON public.voucher_redemptions(appointment_id);

-- Update RLS policies to allow service_role access
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "customer_read_own_redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "staff_read_tenant_redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "service_role_all_redemptions" ON public.voucher_redemptions;

-- Policies
CREATE POLICY "customer_read_own_redemptions" ON public.voucher_redemptions
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "staff_read_tenant_redemptions" ON public.voucher_redemptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users WHERE tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role = ANY(ARRAY['staff'::text, 'admin'::text, 'tenant_admin'::text])
        AND is_active = true
      )
    )
  );

CREATE POLICY "service_role_all_redemptions" ON public.voucher_redemptions
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

