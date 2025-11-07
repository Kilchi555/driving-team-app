-- Migration: Add comparison_type field to cancellation_rules table
-- This allows rules to specify if they apply to "more than X hours" or "less than X hours"
-- Date: 2025-11-04

-- Add comparison_type column to cancellation_rules
ALTER TABLE cancellation_rules 
ADD COLUMN IF NOT EXISTS comparison_type VARCHAR(10) DEFAULT 'more_than' 
CHECK (comparison_type IN ('more_than', 'less_than'));

-- Update existing rules to be 'more_than' by default (for backward compatibility)
UPDATE cancellation_rules 
SET comparison_type = 'more_than' 
WHERE comparison_type IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_comparison_type 
ON cancellation_rules(comparison_type, policy_id);

-- Add comment
COMMENT ON COLUMN cancellation_rules.comparison_type IS 
'Defines the comparison type: "more_than" means rule applies if cancellation is more than X hours before appointment, "less_than" means rule applies if cancellation is less than X hours before appointment';

