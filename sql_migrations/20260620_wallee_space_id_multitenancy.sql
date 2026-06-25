-- Migration: add wallee_space_id to payments for multi-tenant isolation
-- and add unique composite index on payment_wallee_transactions

-- 1. Add wallee_space_id to payments
--    Backfill from tenants.wallee_space_id where possible
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS wallee_space_id INTEGER;

UPDATE payments p
SET wallee_space_id = t.wallee_space_id
FROM tenants t
WHERE p.tenant_id = t.id
  AND p.wallee_transaction_id IS NOT NULL
  AND p.wallee_space_id IS NULL
  AND t.wallee_space_id IS NOT NULL;

-- Index for webhook lookups by (space_id, transaction_id)
CREATE INDEX IF NOT EXISTS idx_payments_wallee_space_txn
  ON payments (wallee_space_id, wallee_transaction_id)
  WHERE wallee_transaction_id IS NOT NULL;

-- 2. Unique index on payment_wallee_transactions to prevent duplicate history rows
--    and allow safe upserts in multi-tenant scenarios
ALTER TABLE payment_wallee_transactions
  ADD COLUMN IF NOT EXISTS wallee_space_id INTEGER;

-- Backfill space_id from the linked payment
UPDATE payment_wallee_transactions pwt
SET wallee_space_id = p.wallee_space_id
FROM payments p
WHERE pwt.payment_id = p.id
  AND pwt.wallee_space_id IS NULL
  AND p.wallee_space_id IS NOT NULL;

-- Unique constraint: a (space, transaction) pair should only appear once
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_wallee_txns_space_txn_unique
  ON payment_wallee_transactions (wallee_space_id, wallee_transaction_id)
  WHERE wallee_space_id IS NOT NULL AND wallee_transaction_id IS NOT NULL;
