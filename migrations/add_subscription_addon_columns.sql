-- Add missing subscription and addon columns to tenants table
-- These are required by the Stripe webhook handler to track plan add-ons

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS addon_seats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_courses_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_affiliate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS wallee_trial_started_at timestamptz;
