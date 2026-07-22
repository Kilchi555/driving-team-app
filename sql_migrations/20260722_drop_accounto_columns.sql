-- Remove dead Accounto integration columns from invoices.
DROP INDEX IF EXISTS idx_invoices_accounto_invoice_id;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_accounto_sync_status;

ALTER TABLE invoices
  DROP COLUMN IF EXISTS accounto_invoice_id,
  DROP COLUMN IF EXISTS accounto_sync_status,
  DROP COLUMN IF EXISTS accounto_sync_error,
  DROP COLUMN IF EXISTS accounto_last_sync;
