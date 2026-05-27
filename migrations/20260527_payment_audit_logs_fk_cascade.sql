-- Fix payment_audit_logs.payment_id FK on delete behavior.
--
-- The column is NOT NULL but the FK was ON DELETE SET NULL, which made
-- every DELETE on public.payments fail with:
--   23502 null value in column "payment_id" of relation "payment_audit_logs"
--         violates not-null constraint
--
-- The matching trigger (log_payment_changes) explicitly writes no audit row
-- for the DELETE operation, so the intended behavior is CASCADE: when a
-- payment is removed, its audit history disappears with it.

ALTER TABLE public.payment_audit_logs
  DROP CONSTRAINT payment_audit_logs_payment_id_fkey;

ALTER TABLE public.payment_audit_logs
  ADD CONSTRAINT payment_audit_logs_payment_id_fkey
  FOREIGN KEY (payment_id)
  REFERENCES public.payments(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
