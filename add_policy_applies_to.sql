-- Migration: Add applies_to field to cancellation_policies table
-- This allows policies to be specific to either individual appointments or courses
-- Date: 2025-11-04

-- Add applies_to column to cancellation_policies
ALTER TABLE cancellation_policies 
ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'appointments' 
CHECK (applies_to IN ('appointments', 'courses'));

-- Update existing policies to be 'appointments' by default (for backward compatibility)
UPDATE cancellation_policies 
SET applies_to = 'appointments' 
WHERE applies_to IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_applies_to 
ON cancellation_policies(applies_to, tenant_id, is_active);

-- Add comment
COMMENT ON COLUMN cancellation_policies.applies_to IS 
'Defines which type of appointments this policy applies to: "appointments" for individual lessons, "courses" for course appointments';

