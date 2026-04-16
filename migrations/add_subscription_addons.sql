-- Migration: Add-on tracking + cancellation notice on tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS addon_seats            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_courses_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_affiliate_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.addon_seats             IS 'Anzahl zusätzlich gebuchter Fahrlehrer-Seats (Add-on)';
COMMENT ON COLUMN tenants.addon_courses_enabled   IS 'Kursbuchungsseite als Add-on aktiv';
COMMENT ON COLUMN tenants.addon_affiliate_enabled IS 'Affiliate-System als Add-on aktiv';
COMMENT ON COLUMN tenants.subscription_cancel_at  IS 'Wenn gesetzt: Subscription wird zu diesem Zeitpunkt gekündigt (1 Monat auf Ende Monat)';
