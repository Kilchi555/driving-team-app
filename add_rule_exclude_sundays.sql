-- Migration: Add exclude_sundays field to cancellation_rules table
-- This allows rules to exclude Sundays from the cancellation time calculation
-- Date: 2025-11-04

-- Add exclude_sundays column to cancellation_rules
ALTER TABLE cancellation_rules 
ADD COLUMN IF NOT EXISTS exclude_sundays BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_exclude_sundays 
ON cancellation_rules(exclude_sundays, policy_id);

-- Add comment
COMMENT ON COLUMN cancellation_rules.exclude_sundays IS 
'If true, Sundays are excluded from the cancellation time calculation. Example: If someone cancels on Saturday 08:00 for a Monday 09:00 appointment, only Saturday and Monday hours count, Sunday is skipped.'; 