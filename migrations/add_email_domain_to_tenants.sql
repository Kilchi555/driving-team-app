-- Migration: Add custom email domain fields to tenants
-- Allows tenants to send emails from their own domain via Resend

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS from_email          TEXT    NULL,
  ADD COLUMN IF NOT EXISTS resend_domain_id    TEXT    NULL,
  ADD COLUMN IF NOT EXISTS resend_domain_verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.from_email             IS 'Custom from-address, e.g. info@driving-team.ch. NULL = use platform default (noreply@simy.ch)';
COMMENT ON COLUMN tenants.resend_domain_id       IS 'Resend domain ID returned by POST /domains. Used to poll verification status.';
COMMENT ON COLUMN tenants.resend_domain_verified IS 'True once Resend confirms all DNS records are valid.';
