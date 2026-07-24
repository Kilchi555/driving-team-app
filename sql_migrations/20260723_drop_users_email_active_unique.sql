-- Allow the same customer email at multiple tenants (Simy multi-tenant).
-- Uniqueness stays per tenant via users_email_tenant_unique (email, tenant_id).
DROP INDEX IF EXISTS public.users_email_active_unique;
