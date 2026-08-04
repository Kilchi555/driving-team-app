-- Custom domain connection status for tenant landing pages
ALTER TABLE public.website_tenants
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_domain_verification JSONB;
