-- PR #1 — Historical data protection / user foreign-key hardening
--
-- WHY:
--   Live production currently uses ON DELETE CASCADE for several user-linked
--   historical relationships. Deleting a public.users row would silently destroy
--   appointment history (and appointment children), audit events, and credit
--   ledger rows.
--
-- WHAT:
--   Reconcile live FK semantics so historical business / financial / audit data
--   cannot be cascaded away by a future user lifecycle operation.
--
-- WHAT IS NOT INCLUDED:
--   No user deletion, anonymization, Auth deletion, lifecycle states, admin
--   soft-delete fixes, RLS changes, or production data mutation.
--
-- LIVE STATE VERIFIED (read-only) against project unyjaetebnaexaflpyoc before
-- writing this migration. Trust live schema over older migration intent.
--
-- Idempotent: safe to re-run (DROP IF EXISTS + ADD IF NOT EXISTS pattern).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) appointments.user_id
--    CURRENT LIVE: ON DELETE CASCADE, NULLABLE (113 existing NULL rows)
--    PROPOSED:     ON DELETE SET NULL
--    REASON:       Client/student appointment history must survive independently.
--                  Column is already nullable (vacations / blocks). SET NULL
--                  also prevents secondary CASCADE loss of notes, exam_results,
--                  product_sales, payment_reminders, vehicle_bookings, etc.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT appointments_user_id_fkey ON public.appointments IS
  'PR#1 historical protection: appointment history survives user removal via SET NULL (column already nullable).';

-- ---------------------------------------------------------------------------
-- 2) appointments.staff_id
--    CURRENT LIVE: ON DELETE CASCADE, NOT NULL (0 NULL rows)
--    PROPOSED:     ON DELETE RESTRICT
--    REASON:       Staff appointment / lesson / calendar history must survive.
--                  Column is NOT NULL and application types/queries assume a
--                  staff_id. SET NULL would require coordinated nullability +
--                  broad app changes — out of scope for PR #1.
--                  RESTRICT fails safely on hard delete while future
--                  anonymization keeps a tombstone users row.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_staff_id_fkey
  FOREIGN KEY (staff_id)
  REFERENCES public.users(id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT appointments_staff_id_fkey ON public.appointments IS
  'PR#1 historical protection: staff-linked appointments cannot be cascaded away; hard delete blocked until tombstone/anonymization architecture is used.';

-- ---------------------------------------------------------------------------
-- 3) audit_logs.user_id
--    CURRENT LIVE: ON DELETE CASCADE, NULLABLE (~23k existing NULL rows)
--    HISTORICAL INTENT (fix_audit_logs_user_fk.sql): ON DELETE SET NULL
--    PROPOSED:     ON DELETE SET NULL (reconcile live with intent)
--    REASON:       Security/audit events must survive actor removal.
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

COMMENT ON CONSTRAINT audit_logs_user_id_fkey ON public.audit_logs IS
  'PR#1 historical protection: audit events survive actor removal via SET NULL (reconciles live CASCADE with prior SET NULL intent).';

-- ---------------------------------------------------------------------------
-- 4) student_credits.user_id
--    CURRENT LIVE: ON DELETE CASCADE, NULLABLE, UNIQUE (user_id, tenant_id)
--    PROPOSED:     ON DELETE RESTRICT
--    REASON:       Wallet/credit balance is financial history. CASCADE would
--                  destroy the ledger shell. RESTRICT preserves attribution to
--                  a tombstone users row (hybrid erasure model). SET NULL would
--                  orphan balances under UNIQUE(user_id, tenant_id) without a
--                  clear owner — deferred as accounting redesign.
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_credits
  DROP CONSTRAINT IF EXISTS student_credits_user_id_fkey;

ALTER TABLE public.student_credits
  ADD CONSTRAINT student_credits_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT student_credits_user_id_fkey ON public.student_credits IS
  'PR#1 historical protection: credit wallet cannot be cascaded away; hard delete blocked while credit row exists.';

-- ---------------------------------------------------------------------------
-- 5) credit_transactions.user_id
--    CURRENT LIVE: ON DELETE CASCADE, NULLABLE
--    PROPOSED:     ON DELETE RESTRICT
--    REASON:       Credit ledger lines are financial history. RESTRICT keeps
--                  attribution to a tombstone users row. SET NULL would preserve
--                  rows but drop ledger attribution; deferred pending display
--                  conventions for null ledger owners.
-- ---------------------------------------------------------------------------
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT credit_transactions_user_id_fkey ON public.credit_transactions IS
  'PR#1 historical protection: credit ledger lines cannot be cascaded away; hard delete blocked while transactions exist.';

COMMIT;
