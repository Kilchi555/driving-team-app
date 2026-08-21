-- Treuhänder-Zugang: Freigaben pro Mandant, Lesen oder Schreiben

CREATE TABLE IF NOT EXISTS public.accountant_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  access text NOT NULL CHECK (access IN ('read', 'write')),
  invite_token text,
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accountant_grants_active_email_idx
  ON public.accountant_grants (tenant_id, lower(email))
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS accountant_grants_user_idx
  ON public.accountant_grants (user_id)
  WHERE revoked_at IS NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accountant_grants_token_idx
  ON public.accountant_grants (invite_token)
  WHERE invite_token IS NOT NULL AND revoked_at IS NULL;

ALTER TABLE public.accountant_grants ENABLE ROW LEVEL SECURITY;
