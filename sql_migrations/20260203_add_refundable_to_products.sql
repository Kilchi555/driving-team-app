-- Migration: Add refundable flag to products
-- Description: Mark products as refundable or non-refundable for cancellations
--              Some products (books, materials) are non-refundable
--              Others (vehicle rental, lesson credit) are refundable

-- Add refundable column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_refundable BOOLEAN DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN products.is_refundable IS 'If true, this product can be refunded when an appointment is cancelled. If false, charges are non-refundable (e.g., books, materials).';

-- Update existing products to have sensible defaults
-- Credit products should be refundable
UPDATE products SET is_refundable = true WHERE is_credit_product = true;

-- Vouchers are non-refundable
UPDATE products SET is_refundable = false WHERE is_voucher = true;

-- Books, materials, etc. are typically non-refundable
-- (manually mark these as needed)

-- Migration complete
