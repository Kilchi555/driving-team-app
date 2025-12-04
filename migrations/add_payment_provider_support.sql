-- Migration: Add payment provider support
-- Adds fields to support multiple payment providers (Wallee, Stripe)

-- 1. Add payment provider field to tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) DEFAULT 'wallee' CHECK (payment_provider IN ('wallee', 'stripe'));

-- 2. Add Stripe configuration fields to tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS stripe_api_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- 3. Add Stripe transaction ID field to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) DEFAULT 'wallee' CHECK (payment_provider IN ('wallee', 'stripe'));

-- 4. Create index for Stripe session lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);

-- 5. Add comment
COMMENT ON COLUMN tenant_settings.payment_provider IS 'Active payment provider: wallee or stripe';
COMMENT ON COLUMN tenant_settings.stripe_api_key IS 'Stripe API Key (Secret Key)';
COMMENT ON COLUMN tenant_settings.stripe_webhook_secret IS 'Stripe Webhook Secret for signature verification';
COMMENT ON COLUMN payments.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN payments.payment_provider IS 'Payment provider used for this payment: wallee or stripe';

