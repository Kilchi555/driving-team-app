-- Bind Stripe Connect accounts to tenants. Server-managed; not client-writable.
-- DEPLOYMENT PREREQUISITE: apply this migration BEFORE deploying the Connect
-- routes that select/update tenants.stripe_connect_account_id. Shipping the
-- application code first yields PostgREST unknown-column errors (handlers
-- currently map that to 403). Do not apply from the remediation agent.
-- Rollback: DROP INDEX tenants_stripe_connect_account_id_uidx; ALTER TABLE
-- tenants DROP COLUMN stripe_connect_account_id; then revert Connect routes.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

COMMENT ON COLUMN public.tenants.stripe_connect_account_id IS
  'Stripe Connect connected account id (acct_...). Written only by server after tenant-admin authorization.';

REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM authenticated;
REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM anon;
REVOKE UPDATE (stripe_connect_account_id) ON TABLE public.tenants FROM PUBLIC;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_connect_account_id_uidx
  ON public.tenants (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;
