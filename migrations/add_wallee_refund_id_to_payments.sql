-- Migration: Add wallee_refund_id to payments table
-- Stores the Wallee Refund entity ID when a refund is issued,
-- so the Wallee Refund webhook can look up the correct payment row.

ALTER TABLE IF EXISTS payments
ADD COLUMN IF NOT EXISTS wallee_refund_id TEXT;

-- Index for webhook lookup
CREATE INDEX IF NOT EXISTS idx_payments_wallee_refund_id ON payments(wallee_refund_id);

COMMENT ON COLUMN payments.wallee_refund_id IS
  'Wallee Refund entity ID (string). Set when a Wallee refund is successfully created. '
  'Used by the Refund webhook handler to locate the payment row and confirm/revert status.';
