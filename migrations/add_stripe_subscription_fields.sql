-- Migration: Stripe Subscription Felder für Tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id          TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end       TIMESTAMPTZ;

-- Neue Plan-Werte: 'trial', 'starter', 'professional', 'enterprise'
-- (subscription_plan ist VARCHAR ohne ENUM-Constraint, kein ALTER nötig)

COMMENT ON COLUMN tenants.stripe_customer_id     IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN tenants.stripe_subscription_id IS 'Aktive Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN tenants.stripe_price_id        IS 'Aktiver Stripe Price ID (price_xxx)';
COMMENT ON COLUMN tenants.current_period_end     IS 'Ende der aktuellen Abrechnungsperiode';
