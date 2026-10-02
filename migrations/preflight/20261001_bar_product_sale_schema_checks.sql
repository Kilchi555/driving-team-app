-- NOT A MIGRATION. Read-only checks to run after
-- migrations/20261001_bar_product_sale_schema_preflight.sql is applied
-- on a database that has been explicitly approved.
-- This file does not insert, update, or delete.
-- Do not run the commented write scenarios against production.

-- 1. Trigger function still exists, still security definer, guard is first.
SELECT
  p.proname,
  p.prosecdef AS security_definer,
  p.proconfig AS config,
  pg_get_userbyid(p.proowner) AS owner,
  p.proacl::text AS acl,
  pg_get_functiondef(p.oid) LIKE '%IF NEW.appointment_id IS NULL THEN%' AS has_null_guard
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_cash_transaction_from_payment';

-- 2. The same trigger still calls that function. No second function was added.
SELECT tgname, pg_get_triggerdef(t.oid) AS def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'payments'
  AND NOT t.tgisinternal
  AND pg_get_triggerdef(t.oid) ILIKE '%create_cash_transaction_from_payment%';

-- 3. Accounting function was not replaced by this draft.
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'book_payment_to_accounting';

-- 4. Cash source check contains exactly the four allowed literals.
SELECT pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conname = 'cash_transactions_transaction_source_check'
  AND conrelid = 'public.cash_transactions'::regclass;

-- 5. Partial unique indexes exist with the expected predicates.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'credit_transactions_credit_product_purchase_payment_uidx',
    'payments_staff_product_sale_idempotency_uidx'
  )
ORDER BY indexname;

-- Behavioral checks, disposable database only, each in a transaction that
-- ends with ROLLBACK. Not executable from this file.
--
-- 1. Appointment cash payment (appointment_id IS NOT NULL, method cash,
--    status completed): trigger still inserts one cash_transactions row
--    with the appointment's staff_id and user_id, status pending,
--    transaction_source default instructor. A second update does not
--    insert another row for that appointment.
-- 2. Payment with appointment_id NULL, method cash, status completed:
--    trigger inserts nothing. The statement succeeds.
-- 3. INSERT cash_transactions.transaction_source = 'product_sale' succeeds.
--    A value outside instructor/office/credit_deposit/product_sale fails.
-- 4. Two credit_transactions with the same reference_id, reference_type
--    payment, transaction_type credit_product_purchase: the second insert
--    raises unique_violation. A deposit or duration_reduction_credit row
--    with that same reference_id still inserts.
-- 5. Two payments with the same tenant_id, metadata.source
--    staff_product_sale, and the same metadata.idempotency_key: the second
--    insert raises unique_violation.
-- 6. A payment with metadata.source = shop, or no source, and the same
--    idempotency_key inserts.
-- 7. A credit_transactions row with transaction_type deposit and the same
--    reference_id inserts.
