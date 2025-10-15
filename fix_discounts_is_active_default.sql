-- Fix is_active default value for discounts table
-- This ensures new discounts are created as active by default

-- Set default value for is_active column to true
ALTER TABLE discounts ALTER COLUMN is_active SET DEFAULT true;

-- Update existing discounts that have NULL is_active to true
UPDATE discounts 
SET is_active = true 
WHERE is_active IS NULL;

-- Ensure the column is NOT NULL
ALTER TABLE discounts ALTER COLUMN is_active SET NOT NULL;
