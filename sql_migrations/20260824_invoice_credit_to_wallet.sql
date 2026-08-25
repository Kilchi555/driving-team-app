-- Flag invoice lines that should credit the student wallet once the invoice is paid.
-- credit_amount_rappen is a snapshot taken at create time (product credit or line total).

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS credit_to_wallet boolean NOT NULL DEFAULT false;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS credit_amount_rappen integer;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credit_applied_rappen integer NOT NULL DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credit_applied_at timestamptz;

COMMENT ON COLUMN invoice_items.credit_to_wallet IS
  'If true, credit_amount_rappen is added to student_credits when the invoice is fully paid.';
COMMENT ON COLUMN invoice_items.credit_amount_rappen IS
  'Wallet credit snapshot in rappen for this line. Applied only after full payment.';
COMMENT ON COLUMN invoices.credit_applied_rappen IS
  'Total wallet credit already applied from this invoice. Used for idempotency.';
