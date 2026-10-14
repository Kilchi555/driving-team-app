-- Atomic shop/Wallee voucher fulfillment idempotency.
-- Deploy prerequisite before relying on webhook uniqueness (do NOT apply from agent to hosted prod here).

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS fulfillment_key TEXT;

COMMENT ON COLUMN vouchers.fulfillment_key IS
  'Stable idempotency key for payment fulfillment (e.g. custom-voucher:<product_uuid>). Unique per payment_id.';

-- Best-effort backfill from legacy description markers written as "...\n[key]"
UPDATE vouchers
SET fulfillment_key = substring(description from '\[(custom-voucher:[^\]]+|voucher:[^\]]+)\]')
WHERE fulfillment_key IS NULL
  AND description IS NOT NULL
  AND description ~ '\[(custom-voucher:[^\]]+|voucher:[^\]]+)\]';

-- Enforce one fulfillment claim per payment + key (NULL keys excluded for legacy rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_payment_fulfillment_key_unique
  ON vouchers (payment_id, fulfillment_key)
  WHERE payment_id IS NOT NULL
    AND fulfillment_key IS NOT NULL;
