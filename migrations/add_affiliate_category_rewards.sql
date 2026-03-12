-- ============================================================
-- Affiliate Category Rewards Migration
-- Allows configuring affiliate rewards per driving category (B, BE, A, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliate_category_rewards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  driving_category  TEXT NOT NULL,
  reward_rappen     INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, driving_category)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_category_rewards_tenant
  ON public.affiliate_category_rewards (tenant_id);

ALTER TABLE public.affiliate_category_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_category_rewards_admin_all" ON public.affiliate_category_rewards
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
