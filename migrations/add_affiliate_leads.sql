-- ============================================================
-- Affiliate Leads Migration
-- Creates: affiliate_leads table for lightweight lead capture
-- Used by: /ref/[tenant] landing page + /api/affiliate/submit-lead
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliate_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  affiliate_code_id   UUID REFERENCES public.affiliate_codes(id) ON DELETE SET NULL,
  affiliate_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  status              TEXT NOT NULL DEFAULT 'sms_sent'
    CHECK (status IN ('sms_sent', 'onboarding_started', 'converted', 'expired')),
  pending_user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  converted_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  UNIQUE (tenant_id, phone)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_affiliate_leads_affiliate_code_id
  ON public.affiliate_leads (affiliate_code_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_leads_tenant_status
  ON public.affiliate_leads (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_affiliate_leads_pending_user_id
  ON public.affiliate_leads (pending_user_id)
  WHERE pending_user_id IS NOT NULL;

-- RLS: only service role can read/write (leads are sensitive data)
ALTER TABLE public.affiliate_leads ENABLE ROW LEVEL SECURITY;

-- Staff/admin of same tenant can view leads via service role API
-- No direct client-side access needed
