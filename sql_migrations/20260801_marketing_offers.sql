-- Marketing offers: central "Aktion" linking discount + template + campaign

CREATE TABLE IF NOT EXISTS public.marketing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  theme_key text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'archived')),
  discount_id uuid REFERENCES public.discounts(id) ON DELETE SET NULL,
  course_id uuid,
  category_code text,
  cta_type text NOT NULL DEFAULT 'booking'
    CHECK (cta_type IN ('booking', 'course', 'ref', 'custom')),
  cta_path text,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  creative_id text,
  valid_until timestamptz,
  offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_offers_tenant ON public.marketing_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_offers_campaign ON public.marketing_offers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_offers_status ON public.marketing_offers(tenant_id, status);

COMMENT ON TABLE public.marketing_offers IS 'Aktion bewerben — links discount, template, campaign and CTA for tenant marketing wizard';
