-- Account switch: linked owner pair, per-actor grants, impersonation sessions.
-- Service-role only. No client/anon access.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS linked_admin_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_switch_all_staff boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_linked_admin_user_id_uidx
  ON public.users (linked_admin_user_id)
  WHERE linked_admin_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.account_switch_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_user_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS account_switch_grants_actor_idx
  ON public.account_switch_grants (actor_user_id);
CREATE INDEX IF NOT EXISTS account_switch_grants_tenant_idx
  ON public.account_switch_grants (tenant_id);

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  ip_address text NULL,
  user_agent text NULL,
  switch_type text NOT NULL DEFAULT 'support'
    CHECK (switch_type IN ('linked', 'support', 'staff_switch'))
);

CREATE INDEX IF NOT EXISTS impersonation_sessions_open_idx
  ON public.impersonation_sessions (actor_user_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.account_switch_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_switch_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.impersonation_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_switch_grants TO service_role;
GRANT ALL ON public.impersonation_sessions TO service_role;

-- Existing owner/staff pairs (same name, same tenant) — display + return-to-admin.
UPDATE public.users s
SET linked_admin_user_id = a.id
FROM public.users a
WHERE s.role = 'staff'
  AND a.role = 'admin'
  AND s.tenant_id = a.tenant_id
  AND s.is_active = true
  AND a.is_active = true
  AND (s.deleted_at IS NULL)
  AND (a.deleted_at IS NULL)
  AND s.linked_admin_user_id IS NULL
  AND lower(trim(s.first_name)) = lower(trim(a.first_name))
  AND lower(trim(coalesce(s.last_name, ''))) = lower(trim(coalesce(a.last_name, '')))
  AND coalesce(a.last_name, '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.users x
    WHERE x.linked_admin_user_id = a.id
  );
