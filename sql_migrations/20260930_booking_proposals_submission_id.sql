-- One public registration/inquiry submission, identified by a client-generated id.
-- Retries of that same submission collide on (tenant_id, submission_id) and must
-- reuse the existing proposal. A later, different submission id is a new inquiry.
-- NULL stays allowed so existing rows and callers that do not send an id are unchanged.
-- This file is a draft. Do not apply it from application code.

ALTER TABLE public.booking_proposals
  ADD COLUMN IF NOT EXISTS submission_id uuid;

COMMENT ON COLUMN public.booking_proposals.submission_id IS
  'Client-generated id of one form submission. Same tenant + id retries resolve to this row. NULL for legacy rows and callers without a submission id.';

CREATE UNIQUE INDEX IF NOT EXISTS booking_proposals_tenant_submission_uidx
  ON public.booking_proposals (tenant_id, submission_id)
  WHERE submission_id IS NOT NULL;
