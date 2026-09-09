-- Bind Stripe Connect accounts to tenants. Server-managed; not client-writable.
-- Do not apply this to production from the remediation agent.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

COMMENT ON COLUMN public.tenants.stripe_connect_account_id IS
  'Stripe Connect connected account id (acct_...). Written only by server after tenant-admin authorization.';

REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM authenticated;
REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM anon;
REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM PUBLIC;
