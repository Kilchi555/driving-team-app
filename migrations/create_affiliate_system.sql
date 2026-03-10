-- ============================================================
-- Affiliate System Migration
-- Creates: affiliate_codes, affiliate_referrals, payout_requests
-- Adds: referred_by_code to users, affiliate reward setting to tenant_settings
-- ============================================================

-- 1. Add referred_by_code to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT DEFAULT NULL;

-- Index for fast lookup when processing rewards
CREATE INDEX IF NOT EXISTS idx_users_referred_by_code
  ON public.users (referred_by_code)
  WHERE referred_by_code IS NOT NULL;

-- 2. Affiliate Codes table (one per user per tenant)
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  total_referrals   INT NOT NULL DEFAULT 0,   -- denormalized counter for fast display
  total_credited_rappen INT NOT NULL DEFAULT 0, -- denormalized total paid out
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, user_id)               -- one code per user per tenant
);

CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code
  ON public.affiliate_codes (code);

CREATE INDEX IF NOT EXISTS idx_affiliate_codes_user_id
  ON public.affiliate_codes (user_id, tenant_id);

-- 3. Affiliate Referrals table (one row per referred customer)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  affiliate_code_id       UUID NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE CASCADE,
  affiliate_user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_appointment_id    UUID DEFAULT NULL,   -- set when reward is triggered
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'credited', 'cancelled')),
  reward_rappen           INT NOT NULL DEFAULT 0,  -- snapshot of reward at time of referral
  credited_at             TIMESTAMPTZ DEFAULT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, referred_user_id)       -- one referral per referred user
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_code_id
  ON public.affiliate_referrals (affiliate_code_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id
  ON public.affiliate_referrals (referred_user_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status
  ON public.affiliate_referrals (status)
  WHERE status = 'pending';

-- 4. Payout Requests table (for external affiliates requesting bank transfer)
CREATE TABLE IF NOT EXISTS public.affiliate_payout_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_rappen     INT NOT NULL,
  iban              TEXT DEFAULT NULL,
  account_holder    TEXT DEFAULT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  notes             TEXT DEFAULT NULL,
  processed_by      UUID DEFAULT NULL REFERENCES public.users(id),
  processed_at      TIMESTAMPTZ DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_requests_user_id
  ON public.affiliate_payout_requests (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_requests_status
  ON public.affiliate_payout_requests (status)
  WHERE status = 'pending';

-- 5. Add affiliate reward setting to tenant_settings
-- Admins set: category='affiliate', setting_key='reward_rappen', setting_value='5000' (= CHF 50)
-- Admins set: category='affiliate', setting_key='enabled', setting_value='true'
INSERT INTO public.tenant_settings (tenant_id, category, setting_key, setting_value, setting_type)
SELECT
  t.id,
  'affiliate',
  'reward_rappen',
  '5000',
  'number'
FROM public.tenants t
ON CONFLICT (tenant_id, category, setting_key) DO NOTHING;

INSERT INTO public.tenant_settings (tenant_id, category, setting_key, setting_value, setting_type)
SELECT
  t.id,
  'affiliate',
  'enabled',
  'true',
  'boolean'
FROM public.tenants t
ON CONFLICT (tenant_id, category, setting_key) DO NOTHING;

-- 6. RLS Policies

-- affiliate_codes: users can read their own, staff/admin can read all in tenant
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_codes_select_own" ON public.affiliate_codes
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin', 'super_admin')
    )
  );

CREATE POLICY "affiliate_codes_insert_own" ON public.affiliate_codes
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- affiliate_referrals: users can read their own referrals, staff/admin can read all
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_referrals_select_own" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- affiliate_payout_requests: users can read/insert their own
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_payout_select_own" ON public.affiliate_payout_requests
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "affiliate_payout_insert_own" ON public.affiliate_payout_requests
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
