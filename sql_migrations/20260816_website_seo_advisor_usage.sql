-- Daily SEO-advisor quota + last briefing (3 runs / Zurich calendar day)
ALTER TABLE public.website_tenants
  ADD COLUMN IF NOT EXISTS seo_advisor_usage jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.website_tenants.seo_advisor_usage IS
  'Website SEO advisor: { date, count, last } — 3 analyses per Europe/Zurich day';
