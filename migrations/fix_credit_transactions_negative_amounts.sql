-- Migration: fix_credit_transactions_negative_amounts
-- Fix historical credit_transactions where deductions were stored as positive amounts.
-- All transaction types that represent a deduction from the balance should have
-- a negative amount_rappen. This script identifies and corrects those rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DIAGNOSE: Show affected rows BEFORE fixing (run first to verify)
-- ─────────────────────────────────────────────────────────────────────────────
/*
SELECT
  transaction_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE amount_rappen > 0) AS positive,
  COUNT(*) FILTER (WHERE amount_rappen < 0) AS negative,
  COUNT(*) FILTER (WHERE amount_rappen = 0) AS zero
FROM credit_transactions
GROUP BY transaction_type
ORDER BY transaction_type;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FIX: Flip positive amounts to negative for deduction transaction types
-- Only affects rows where amount_rappen > 0 (incorrectly positive)
-- ─────────────────────────────────────────────────────────────────────────────

-- appointment / appointment_payment: Fahrstunde mit Guthaben bezahlt
UPDATE credit_transactions
SET amount_rappen = -amount_rappen
WHERE transaction_type IN ('appointment', 'appointment_payment')
  AND amount_rappen > 0;

-- payment: generische Zahlung via Guthaben
UPDATE credit_transactions
SET amount_rappen = -amount_rappen
WHERE transaction_type = 'payment'
  AND amount_rappen > 0;

-- withdrawal / withdrawal_completed: Auszahlung an Kunden
UPDATE credit_transactions
SET amount_rappen = -amount_rappen
WHERE transaction_type IN ('withdrawal', 'withdrawal_completed')
  AND amount_rappen > 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VERIFY: Check result after fix
-- ─────────────────────────────────────────────────────────────────────────────
/*
SELECT
  transaction_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE amount_rappen > 0) AS positive,
  COUNT(*) FILTER (WHERE amount_rappen < 0) AS negative
FROM credit_transactions
GROUP BY transaction_type
ORDER BY transaction_type;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: The following types should ALWAYS be positive (credit increases):
--   deposit, refund, topup, credit_topup, voucher,
--   cancellation_credit_refund, duration_reduction_credit
-- The following types should ALWAYS be negative (credit decreases):
--   appointment, appointment_payment, payment, withdrawal, withdrawal_completed,
--   withdrawal_pending (pending = already reserved/deducted)
-- ─────────────────────────────────────────────────────────────────────────────
