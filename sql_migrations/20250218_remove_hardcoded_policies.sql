-- Migration: Remove all hardcoded cancellation policies and templates
-- Reason: All policies must be configured explicitly by each tenant via Admin UI
-- Date: 2025-02-18

-- NOTE: This migration removes hardcoded policies that were inserted during database initialization
-- After this migration, each tenant MUST configure their own cancellation policies
-- The system will error if a tenant tries to cancel an appointment without a configured policy

-- Delete all cancellation policies that have tenant_id = NULL (templates) or no specific configuration
-- Keep only policies that are explicitly assigned to a tenant_id
DELETE FROM cancellation_rules 
WHERE policy_id IN (
  SELECT id FROM cancellation_policies 
  WHERE (tenant_id IS NULL OR is_default = true)
  AND created_by IS NULL -- Only delete auto-generated policies, not user-created ones
);

DELETE FROM cancellation_policies 
WHERE (tenant_id IS NULL OR is_default = true)
AND created_by IS NULL; -- Only delete auto-generated policies, not user-created ones

-- Verify cleanup
-- Run this to check which policies remain:
-- SELECT id, name, tenant_id, is_default, created_by FROM cancellation_policies;
-- SELECT cr.id, cr.policy_id, p.name, p.tenant_id FROM cancellation_rules cr JOIN cancellation_policies p ON p.id = cr.policy_id;

