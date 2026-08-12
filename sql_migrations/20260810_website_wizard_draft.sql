-- Persist in-progress website wizard fields (AI-accepted copy, service descriptions)
-- so they survive refresh before final publish.
ALTER TABLE public.website_tenants
  ADD COLUMN IF NOT EXISTS wizard_draft jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.website_tenants.wizard_draft IS
  'In-progress website wizard fields (e.g. AI-accepted service descriptions) persisted before final publish';
