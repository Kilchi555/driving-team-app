-- Add wallee_test_mode flag to tenants.
-- When true, new Wallee transactions use WALLEE_TEST_* credentials from tenant_secrets
-- while the webhook resolves credentials by incoming space ID (space-aware), so existing
-- pending transactions in the production space continue to be verified correctly.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallee_test_mode BOOLEAN NOT NULL DEFAULT false;
