-- Add max_per_user column to discounts table
-- This allows setting a limit on how many times a single customer can use a discount code

-- Add max_per_user column to discounts table
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS max_per_user INTEGER DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN discounts.max_per_user IS 'Maximum number of times a single customer can use this discount code. NULL means unlimited.';

-- Create an index for better performance when checking per-user limits
CREATE INDEX IF NOT EXISTS idx_discounts_max_per_user ON discounts(max_per_user) WHERE max_per_user IS NOT NULL;

-- Update existing discounts to have NULL max_per_user (unlimited per user)
-- This ensures backward compatibility
UPDATE discounts 
SET max_per_user = NULL 
WHERE max_per_user IS NULL;
