-- Allow tenants to permanently skip online-payments onboarding for now.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_wallee_onboarding_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_wallee_onboarding_status_check
  CHECK (wallee_onboarding_status = ANY (ARRAY[
    'not_started'::text,
    'pending'::text,
    'pending_uid'::text,
    'active'::text,
    'skipped'::text
  ]));

COMMENT ON COLUMN public.tenants.wallee_onboarding_status IS
  'not_started | pending | pending_uid | active | skipped (opted out for now)';
