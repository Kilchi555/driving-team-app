-- Add allow_voucher_creation column to tenants table
-- This setting controls whether customers can create custom vouchers in the shop

-- Add the column if it doesn't exist
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS allow_voucher_creation BOOLEAN DEFAULT true;

-- Add a comment to explain the column
COMMENT ON COLUMN tenants.allow_voucher_creation IS 'Controls whether customers can create custom vouchers in the shop. Defaults to true.';

-- Update existing tenants to have this setting enabled by default
UPDATE tenants 
SET allow_voucher_creation = true 
WHERE allow_voucher_creation IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name = 'allow_voucher_creation';
