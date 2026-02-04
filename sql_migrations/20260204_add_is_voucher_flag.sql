-- Migration: Add is_voucher flag to discount_sales table
-- Purpose: Distinguish between voucher discounts (refundable) and staff discounts (non-refundable)
-- Created: 2026-02-04

-- 1. Add is_voucher column to discount_sales
ALTER TABLE discount_sales
ADD COLUMN IF NOT EXISTS is_voucher BOOLEAN DEFAULT false;

-- 2. Add comment
COMMENT ON COLUMN discount_sales.is_voucher IS 'True if this discount is from a customer-paid voucher (refundable on cancellation), false if it is a staff/promotional discount (non-refundable)';

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_discount_sales_is_voucher ON discount_sales(is_voucher);

-- Migration complete
SELECT '✅ is_voucher column added to discount_sales table!' as status;
