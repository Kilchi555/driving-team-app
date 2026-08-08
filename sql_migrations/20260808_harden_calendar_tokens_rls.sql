-- Harden calendar_tokens RLS: remove world-readable / world-writable policies.
-- ICS feed uses the service role (server/api/calendar/ics.get.ts), so public
-- USING (true) SELECT is not required and leaked all staff calendar tokens.

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies (from 20250101_fix_calendar_tokens_rls.sql)
DROP POLICY IF EXISTS "calendar_tokens_select" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_insert" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_update" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_delete" ON public.calendar_tokens;

-- Keep / recreate ownership-scoped policies (idempotent)
DROP POLICY IF EXISTS "staff_read_own_tokens" ON public.calendar_tokens;
DROP POLICY IF EXISTS "admin_read_tenant_tokens" ON public.calendar_tokens;
DROP POLICY IF EXISTS "staff_manage_own_tokens" ON public.calendar_tokens;
DROP POLICY IF EXISTS "staff_update_own_tokens" ON public.calendar_tokens;
DROP POLICY IF EXISTS "service_role_tokens" ON public.calendar_tokens;

CREATE POLICY "staff_read_own_tokens"
ON public.calendar_tokens
FOR SELECT
USING (
  staff_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "admin_read_tenant_tokens"
ON public.calendar_tokens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = ANY (ARRAY['admin'::text, 'tenant_admin'::text, 'super_admin'::text])
      AND u.tenant_id = (
        SELECT users.tenant_id FROM public.users WHERE users.id = calendar_tokens.staff_id
      )
  )
);

CREATE POLICY "staff_manage_own_tokens"
ON public.calendar_tokens
FOR INSERT
WITH CHECK (
  staff_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "staff_update_own_tokens"
ON public.calendar_tokens
FOR UPDATE
USING (
  staff_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  staff_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Service role bypasses RLS by default; explicit policy kept for clarity in some setups
CREATE POLICY "service_role_tokens"
ON public.calendar_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
