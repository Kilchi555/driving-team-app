-- Fix discounts table usage limits - both total and per-user limits
-- This migration ensures both usage_limit and max_per_user columns exist and are properly configured

-- Add max_per_user column if it doesn't exist
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS max_per_user INTEGER DEFAULT NULL;

-- Ensure usage_limit column exists (it should already exist from previous migrations)
ALTER TABLE discounts 
ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL;

-- Add comments to document both columns
COMMENT ON COLUMN discounts.usage_limit IS 'Maximum total number of times this discount code can be used across all customers. NULL means unlimited.';
COMMENT ON COLUMN discounts.max_per_user IS 'Maximum number of times a single customer can use this discount code. NULL means unlimited.';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discounts_usage_limit ON discounts(usage_limit) WHERE usage_limit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_max_per_user ON discounts(max_per_user) WHERE max_per_user IS NOT NULL;

-- Update existing discounts to ensure proper defaults
UPDATE discounts 
SET usage_limit = NULL 
WHERE usage_limit = 0 OR usage_limit < 0;

UPDATE discounts 
SET max_per_user = NULL 
WHERE max_per_user = 0 OR max_per_user < 0;

-- Add a check constraint to ensure positive values
ALTER TABLE discounts 
ADD CONSTRAINT IF NOT EXISTS discounts_usage_limit_positive 
CHECK (usage_limit IS NULL OR usage_limit > 0);

ALTER TABLE discounts 
ADD CONSTRAINT IF NOT EXISTS discounts_max_per_user_positive 
CHECK (max_per_user IS NULL OR max_per_user > 0);
