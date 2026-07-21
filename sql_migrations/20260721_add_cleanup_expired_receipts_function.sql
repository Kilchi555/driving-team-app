-- Migration: Add cleanup_expired_receipts() function
--
-- Receipt/evaluation PDFs in the `receipts` storage bucket are always
-- regenerated on demand from the payments/appointments/evaluations tables
-- (see server/api/payments/receipt.post.ts and
-- server/api/evaluations/export-pdf.post.ts). They are only uploaded to
-- Storage to obtain a temporary HTTPS URL that native (Capacitor) app
-- clients can open, and web clients fetch/download shortly after
-- generation. There is no need to retain them long-term:
--   - the source of truth for accounting purposes remains the DB rows
--     (payments, accounting entries), which satisfy the 10-year retention
--     requirement under Art. 958f OR regardless of whether the rendered
--     PDF still exists in Storage.
--   - keeping old PDFs around only adds storage cost and an unnecessary,
--     ever-growing exposure surface for customer personal/payment data.
--
-- storage.objects is not exposed via PostgREST by default, so a
-- SECURITY DEFINER function is used to let the service role list expired
-- objects. Supabase blocks direct SQL DELETE on storage.objects (via the
-- storage.protect_delete() trigger, to avoid orphaning the underlying
-- blobs), so this function only SELECTs the expired paths — the actual
-- deletion is done by the cron job via the Storage API
-- (server/api/cron/cleanup-expired-receipts.post.ts), which cleans up the
-- object row and its backing blob together.
--
-- Invoices (`invoices/...`) and dunning notices (`dunning/...`) are
-- intentionally NOT matched here and are kept longer, pending
-- confirmation with accounting/Treuhänder on formal retention rules.

CREATE OR REPLACE FUNCTION list_expired_receipts(retention_hours integer DEFAULT 48)
RETURNS TABLE(expired_path text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name
  FROM storage.objects
  WHERE bucket_id = 'receipts'
    AND (
      name ~ '^evaluations/[0-9]{4}/[0-9]{2}/'   -- evaluation PDF exports
      OR name ~ '^[0-9]{4}/[0-9]{2}/'             -- combined/single payment receipts
    )
    AND created_at < now() - (retention_hours || ' hours')::interval;
$$;

COMMENT ON FUNCTION list_expired_receipts(integer) IS
  'Lists ephemeral receipt/evaluation PDF paths older than retention_hours in the receipts bucket, for deletion via the Storage API. These are always regenerated on demand from DB data, so no long-term retention is needed. Invoices/dunning are excluded.';

GRANT EXECUTE ON FUNCTION list_expired_receipts(integer) TO service_role;

SELECT '✅ list_expired_receipts() function created!' AS status;
