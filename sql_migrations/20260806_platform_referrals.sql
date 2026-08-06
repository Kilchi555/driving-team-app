-- Platform tenant→tenant referrals (Simy SaaS), separate from client affiliate.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_referred_by_code
  ON tenants (referred_by_code)
  WHERE referred_by_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_referral_codes_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT platform_referral_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_platform_referral_codes_code_active
  ON platform_referral_codes (code)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS platform_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referred_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code_id UUID REFERENCES platform_referral_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'attributed'
    CHECK (status IN (
      'attributed',
      'pending_second',
      'qualified',
      'rewarded',
      'cancelled',
      'failed'
    )),
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_paid_invoice_id TEXT,
  first_paid_at TIMESTAMPTZ,
  qualified_invoice_id TEXT,
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  paid_plan_invoice_count INT NOT NULL DEFAULT 0,
  plan_amount_rappen INT,
  reward_rappen INT,
  reward_plan TEXT,
  stripe_balance_tx_id TEXT,
  last_error TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_referrals_referred_unique UNIQUE (referred_tenant_id),
  CONSTRAINT platform_referrals_no_self CHECK (referrer_tenant_id <> referred_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_referrals_referrer
  ON platform_referrals (referrer_tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_referrals_status
  ON platform_referrals (status)
  WHERE status IN ('attributed', 'pending_second', 'qualified', 'failed');

COMMENT ON TABLE platform_referral_codes IS 'One Simy invite code per tenant for tenant→tenant referrals';
COMMENT ON TABLE platform_referrals IS 'Attribution + reward ledger; reward = 50% of pure plan price on 2nd paid plan invoice';

ALTER TABLE platform_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_referral_codes_no_client_access ON platform_referral_codes;
CREATE POLICY platform_referral_codes_no_client_access ON platform_referral_codes
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS platform_referrals_no_client_access ON platform_referrals;
CREATE POLICY platform_referrals_no_client_access ON platform_referrals
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
