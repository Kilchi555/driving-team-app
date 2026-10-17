-- =============================================================================
-- apply_invoice_wallet_credit — ISOLATED MANUAL PostgreSQL harness
-- =============================================================================
-- NOT part of vitest / CI / application boot.
-- Do NOT run against Production (unyjaetebnaexaflpyoc) or shared Staging.
-- Use only a disposable local Postgres or a dedicated throwaway project.
--
-- SAFETY GUARD (required):
--   SET app.apply_invoice_wallet_credit_live_ok = 'I_ACCEPT_SYNTHETIC_FIXTURES_ONLY';
-- without that GUC, setup aborts.
--
-- Prerequisites:
--   * migrations/20261011_apply_invoice_wallet_credit.sql applied on THIS DB only
--   * service_role can execute apply_invoice_wallet_credit (or SET ROLE equivalent)
--
-- Concurrency: plain SQL cannot open two real sessions. Cases marked CONCURRENT
-- require TWO psql connections. Do not fake concurrency with sequential statements.
-- =============================================================================

-- ---------- 0) Guard ----------
DO $$
BEGIN
  IF current_setting('app.apply_invoice_wallet_credit_live_ok', true)
       IS DISTINCT FROM 'I_ACCEPT_SYNTHETIC_FIXTURES_ONLY' THEN
    RAISE EXCEPTION
      'REFUSING: set app.apply_invoice_wallet_credit_live_ok = I_ACCEPT_SYNTHETIC_FIXTURES_ONLY on a disposable DB';
  END IF;
END $$;

-- ---------- 1) Synthetic fixture IDs (replace only if colliding) ----------
-- tenant:  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1
-- user:    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1
-- inv_a:   cccccccc-cccc-4ccc-8ccc-ccccccccccc1
-- inv_b:   cccccccc-cccc-4ccc-8ccc-ccccccccccc2
-- actor:   dddddddd-dddd-4ddd-8ddd-ddddddddddd1

-- ---------- 2) SETUP (session 1) — create minimal FKs as required by YOUR schema ----------
-- Adjust INSERT columns to match local FK requirements (tenants/users/invoices/invoice_items).
-- Example skeleton (edit before use):
--
-- BEGIN;
--   -- INSERT tenant / user / paid invoices / credit lines (amount 5000 and 3000) …
--   -- Ensure no pre-existing student_credits / credit_transactions for these IDs.
-- COMMIT;

-- ---------- 3) ASSERT helpers (run after each case) ----------
-- SELECT balance_rappen FROM student_credits WHERE user_id = '…' AND tenant_id = '…';
-- SELECT count(*), coalesce(sum(amount_rappen),0) FROM credit_transactions
--   WHERE tenant_id='…' AND reference_id='…' AND reference_type='invoice'
--     AND transaction_type IN ('deposit','credit_product_purchase') AND status='completed';
-- SELECT credit_applied_rappen FROM invoices WHERE id='…' AND tenant_id='…';

-- ---------- 4) CASE: successful apply (session 1) ----------
-- BEGIN;
--   SELECT set_config('role', 'service_role', true);
--   SELECT public.apply_invoice_wallet_credit(
--     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
--     'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
--     'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
--     'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::uuid
--   );
-- COMMIT;
-- Expect: outcome=applied; ledger count=1; balance += 5000; credit_applied_rappen=5000.

-- ---------- 5) CASE: retry after confirmed commit (session 1) ----------
-- Same call again.
-- Expect: outcome=already_applied; applied_rappen=0; ledger count still 1; balance unchanged.

-- ---------- 6) CASE: CONCURRENT same invoice (TWO sessions) ----------
-- Reset fixture invoice to paid, credit_applied=0, delete ledger, set balance known.
-- Session A: BEGIN; SELECT apply_…(inv_a…);  -- hold before COMMIT
-- Session B: BEGIN; SELECT apply_…(inv_a…);  -- blocks on invoice FOR UPDATE
-- Session A: COMMIT;
-- Session B: completes then COMMIT;
-- Expect: exactly one applied (or one applied + one already_applied if B re-reads after A);
--         ledger count=1; balance += amount once.
-- NOTE: With invoice FOR UPDATE, B waits; after A commits B should see marker+ledger → already_applied.

-- ---------- 7) CASE: CONCURRENT distinct invoices same wallet (TWO sessions) ----------
-- inv_a amount 5000, inv_b amount 3000; both unpaid→paid; no ledgers; shared wallet.
-- Session A: BEGIN; apply inv_a; COMMIT;
-- Session B: BEGIN; apply inv_b; COMMIT;  (overlap while A holds wallet lock)
-- Expect: two ledger rows; balance += 8000.

-- ---------- 8) CASE: first credit, no wallet row ----------
-- DELETE student_credits for user/tenant; apply inv with credit lines.
-- Expect: wallet row created; balance = amount; ledger=1; marker=amount.

-- ---------- 9) CASE: wrong tenant / wrong user ----------
-- Expect: exception invoice_not_found or user_mismatch; no ledger/balance/marker change.

-- ---------- 10) CASE: transaction rollback ----------
-- BEGIN;
--   SELECT apply_…(fresh invoice);
--   RAISE EXCEPTION 'simulated_abort';
-- ROLLBACK;
-- Expect: no ledger; balance unchanged; marker unchanged.

-- ---------- 11) LEGACY ORPHANS (fail closed) ----------
-- A) Marker without ledger:
--    SET credit_applied_rappen = 5000; ensure no ledger; call apply.
--    Expect: reconciliation_required_marker_without_ledger; no further credit.
-- B) Ledger without marker (matching amount):
--    INSERT completed deposit ledger; credit_applied_rappen=0; call apply.
--    Expect: reconciliation_required_ledger_without_marker; balance NOT incremented again.
-- C) Ledger amount mismatch vs invoice_items:
--    Ledger 5000, items sum 3000, marker 0 or matching wrong.
--    Expect: reconciliation_required_amount_mismatch (or marker_ledger_amount).
-- D) Marker + ledger amount disagree:
--    Expect: reconciliation_required_marker_ledger_amount.
-- E) Balance-without-ledger (marker=0, no ledger, balance already += amount):
--    UNDETECTABLE — apply will credit again. Document result; do NOT auto-heal.
--    Separate reconciliation required before production cutover.

-- ---------- 12) CLEANUP ----------
-- DELETE synthetic credit_transactions / invoice_items / invoices / student_credits /
-- users / tenants created for this harness. Only delete rows with the fixture UUIDs above.

-- ---------- 13) READ-ONLY duplicate preflight (target DB before migration apply) ----------
-- SELECT tenant_id, reference_id, count(*) AS cnt
-- FROM public.credit_transactions
-- WHERE reference_type = 'invoice'
--   AND transaction_type IN ('deposit', 'credit_product_purchase')
--   AND status = 'completed'
-- GROUP BY tenant_id, reference_id
-- HAVING count(*) > 1;
-- Index create is NOT safe until this returns 0 rows on the target database.
