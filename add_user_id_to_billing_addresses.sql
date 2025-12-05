-- Add user_id column to company_billing_addresses
-- This allows us to link billing addresses to specific students/users

ALTER TABLE company_billing_addresses 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_billing_addresses_user_id 
ON company_billing_addresses(user_id);

-- Backfill existing addresses - use created_by as a reference if needed
-- Note: This assumes created_by references auth.users.id, we may need to adjust
UPDATE company_billing_addresses 
SET user_id = NULL  
WHERE user_id IS NULL;

-- Add constraint that at least one of user_id or tenant-level should exist
-- (optional, depending on your business logic)

