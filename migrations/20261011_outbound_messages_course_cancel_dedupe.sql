-- Durable uniqueness for course-cancellation participant emails.
-- FILE ONLY in this PR — do not apply until separately authorized.
--
-- Read-only preflight (production unyjaetebnaexaflpyoc, 2026-10-11):
--   active course_cancelled rows in pending|sending|sent = 0 → index create is safe now.
-- Re-check for duplicates before applying on any environment:
--   SELECT tenant_id, context_data->>'course_id', context_data->>'registration_id', COUNT(*)
--   FROM outbound_messages_queue
--   WHERE channel = 'email'
--     AND context_data->>'stage' = 'course_cancelled'
--     AND status IN ('pending', 'sending', 'sent')
--   GROUP BY 1, 2, 3
--   HAVING COUNT(*) > 1;

ALTER TABLE public.outbound_messages_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text;

COMMENT ON COLUMN public.outbound_messages_queue.dedupe_key IS
  'Optional logical idempotency key (e.g. course_cancelled:{tenant}:{course}:{registration}). Partial unique index enforces at most one pending|sending|sent row per key.';

-- Backfill known course-cancellation rows from context_data (idempotent).
UPDATE public.outbound_messages_queue
SET dedupe_key = concat_ws(
  ':',
  'course_cancelled',
  tenant_id::text,
  context_data->>'course_id',
  context_data->>'registration_id'
)
WHERE channel = 'email'
  AND context_data->>'stage' = 'course_cancelled'
  AND context_data->>'course_id' IS NOT NULL
  AND context_data->>'registration_id' IS NOT NULL
  AND (dedupe_key IS NULL OR btrim(dedupe_key) = '');

-- At most one active (not failed) message per logical course-cancel event.
-- Failed/retrying rows may coexist so genuine failures remain retryable.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_messages_queue_course_cancel_dedupe_uidx
  ON public.outbound_messages_queue (tenant_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND channel = 'email'
    AND status IN ('pending', 'sending', 'sent');
