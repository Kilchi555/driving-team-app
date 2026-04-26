-- Migration: Add Wallee onboarding status and document fields to tenants
-- This supports the 3-phase model:
--   not_started → Trial (only cash/invoice payments)
--   pending     → KYC documents submitted, waiting for Wallee space setup
--   active      → wallee_space_id + wallee_user_id set, online payments live

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS wallee_onboarding_status TEXT
    NOT NULL DEFAULT 'not_started'
    CHECK (wallee_onboarding_status IN ('not_started', 'pending', 'active')),
  ADD COLUMN IF NOT EXISTS wallee_handelsregister_url TEXT,
  ADD COLUMN IF NOT EXISTS wallee_uid_number         TEXT,
  ADD COLUMN IF NOT EXISTS wallee_iban               TEXT,
  ADD COLUMN IF NOT EXISTS wallee_application_notes  TEXT,
  ADD COLUMN IF NOT EXISTS wallee_applied_at         TIMESTAMPTZ;

COMMENT ON COLUMN tenants.wallee_onboarding_status IS
  'not_started = Trial phase, no online payments; pending = KYC documents submitted; active = Wallee Space configured and live';

-- Backfill: tenants that already have wallee_space_id set → mark as active
UPDATE tenants
  SET wallee_onboarding_status = 'active'
  WHERE wallee_space_id IS NOT NULL
    AND wallee_user_id  IS NOT NULL;
