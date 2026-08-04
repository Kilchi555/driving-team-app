-- SMS quota: segment tracking on sms_logs + optional Stripe item cache on tenants

ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS segment_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS billable BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN sms_logs.segment_count IS 'Twilio-style SMS segments for this message (GSM-7/UCS-2)';
COMMENT ON COLUMN sms_logs.billable IS 'When true, counts toward tenant SMS quota and Stripe overage';

CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant_sent_billable
  ON sms_logs (tenant_id, sent_at)
  WHERE billable = true AND tenant_id IS NOT NULL;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_sms_subscription_item_id TEXT;

COMMENT ON COLUMN tenants.stripe_sms_subscription_item_id IS
  'Stripe subscription item id for metered SMS overage (STRIPE_PRICE_ADDON_SMS_OVERAGE)';
