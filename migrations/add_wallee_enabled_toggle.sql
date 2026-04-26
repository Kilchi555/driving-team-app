-- Migration: Add wallee_enabled toggle (separate from onboarding lifecycle)
--
-- wallee_onboarding_status = one-time KYC journey (not_started → pending → active)
-- wallee_enabled           = runtime light-switch (can flip any time after onboarding)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS wallee_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.wallee_enabled IS
  'Runtime toggle for online payments. Can only be true when wallee_onboarding_status = active. '
  'Tenant or super-admin can flip this at any time without re-doing KYC.';

-- Backfill: already-active tenants should have wallee_enabled = true
UPDATE tenants
  SET wallee_enabled = true
  WHERE wallee_onboarding_status = 'active'
    AND wallee_space_id IS NOT NULL
    AND wallee_user_id  IS NOT NULL;
