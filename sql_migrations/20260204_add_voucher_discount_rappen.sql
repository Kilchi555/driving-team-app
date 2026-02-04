-- Migration: Add voucher_discount_rappen to payments table
-- Purpose: Track refundable voucher discounts separately from non-refundable staff discounts
-- Created: 2026-02-04

-- 1. Add new column for voucher discount (refundable part)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS voucher_discount_rappen INTEGER DEFAULT 0;

-- 2. Add comment
COMMENT ON COLUMN payments.voucher_discount_rappen IS 'Discount amount from customer-paid vouchers (refundable during cancellation). Staff discounts go in discount_amount_rappen.';

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_voucher_discount ON payments(voucher_discount_rappen);

-- Migration complete
SELECT '✅ voucher_discount_rappen column added to payments table!' as status;
