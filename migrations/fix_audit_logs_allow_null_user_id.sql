-- Migration: Allow NULL user_id in audit_logs for anonymous actions
-- Date: 2026-01-12
-- 
-- PROBLEM:
-- Anonymous requests (e.g., tenant branding after logout) cannot be logged
-- because user_id has NOT NULL constraint.
--
-- SOLUTION:
-- Remove NOT NULL constraint from user_id column to allow anonymous audit logs.
-- Anonymous actions will still be tracked via ip_address.

-- Make user_id nullable (allow anonymous audit logs)
ALTER TABLE audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure at least ONE identifier exists:
-- Either user_id, auth_user_id, OR ip_address must be present
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_has_identifier 
CHECK (
  user_id IS NOT NULL 
  OR auth_user_id IS NOT NULL 
  OR ip_address IS NOT NULL
);

-- Add comment explaining the change
COMMENT ON COLUMN audit_logs.user_id IS 
  'User ID from users table. Can be NULL for anonymous actions (tracked via ip_address instead).';

COMMENT ON CONSTRAINT audit_logs_has_identifier ON audit_logs IS
  'Ensures every audit log has at least one identifier: user_id, auth_user_id, or ip_address for anonymous actions.';

