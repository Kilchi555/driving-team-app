-- Add can_accept_cash column to users table
-- This controls which staff members can accept cash payments

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS can_accept_cash BOOLEAN DEFAULT true;

-- Update existing staff to allow cash payments by default
UPDATE users 
SET can_accept_cash = true 
WHERE role IN ('staff', 'admin');

-- Add comment
COMMENT ON COLUMN users.can_accept_cash IS 'Whether this staff member can accept cash payments';

