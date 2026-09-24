-- Persist the existing new/existing/unknown result from resolveNewCustomerState.
-- Does not change users.acquisition_* and does not backfill historical rows.
-- A conversion row is not a new-customer conversion unless customer_state = 'new'.

ALTER TABLE public.marketing_conversions
  ADD COLUMN IF NOT EXISTS customer_state text;

ALTER TABLE public.marketing_conversions
  DROP CONSTRAINT IF EXISTS marketing_conversions_customer_state_check;

ALTER TABLE public.marketing_conversions
  ADD CONSTRAINT marketing_conversions_customer_state_check
  CHECK (
    customer_state IS NULL
    OR customer_state IN ('new', 'existing', 'unknown')
  );

COMMENT ON COLUMN public.marketing_conversions.customer_state IS
  'Result of resolveNewCustomerState at conversion time. new = no prior confirmed productive appointment and no prior confirmed course registration in this tenant. existing = such a history exists. unknown = identity missing or history lookup failed. Not inferred from user existence alone.';

CREATE UNIQUE INDEX IF NOT EXISTS marketing_conversions_proposal_id_uidx
  ON public.marketing_conversions (proposal_id)
  WHERE proposal_id IS NOT NULL;
