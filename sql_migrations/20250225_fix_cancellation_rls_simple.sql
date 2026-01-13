-- Fix cancellation_policies RLS - Allow reading ANY policy for authenticated users
-- The WHERE clause in the query should not be overridden by RLS

DROP POLICY IF EXISTS cancellation_policies_select ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_insert ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_update ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_delete ON public.cancellation_policies;

DROP POLICY IF EXISTS cancellation_rules_select ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_insert ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_update ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_delete ON public.cancellation_rules;

-- ===== CANCELLATION_POLICIES TABLE =====

-- SELECT: All authenticated users can read policies
-- (The WHERE clause in queries will further filter)
CREATE POLICY cancellation_policies_select ON public.cancellation_policies
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins/tenant_admins can create
CREATE POLICY cancellation_policies_insert ON public.cancellation_policies
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- UPDATE: Only admins/tenant_admins can update
CREATE POLICY cancellation_policies_update ON public.cancellation_policies
FOR UPDATE
TO authenticated
USING (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
)
WITH CHECK (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- DELETE: Only admins/tenant_admins can delete
CREATE POLICY cancellation_policies_delete ON public.cancellation_policies
FOR DELETE
TO authenticated
USING (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- ===== CANCELLATION_RULES TABLE =====

-- SELECT: All authenticated users can read rules
CREATE POLICY cancellation_rules_select ON public.cancellation_rules
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins/tenant_admins can create
CREATE POLICY cancellation_rules_insert ON public.cancellation_rules
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- UPDATE: Only admins/tenant_admins can update
CREATE POLICY cancellation_rules_update ON public.cancellation_rules
FOR UPDATE
TO authenticated
USING (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
)
WITH CHECK (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- DELETE: Only admins/tenant_admins can delete
CREATE POLICY cancellation_rules_delete ON public.cancellation_rules
FOR DELETE
TO authenticated
USING (
  (
    auth.uid() IN (
      SELECT users.auth_user_id
      FROM users
      WHERE users.role = ANY(ARRAY['admin', 'tenant_admin'])
        AND users.is_active = true
    )
  )
);

-- Verify result
SELECT 
  tablename,
  policyname,
  permissive,
  substring(qual from 1 for 80) as qual_preview
FROM pg_policies
WHERE tablename IN ('cancellation_policies', 'cancellation_rules')
ORDER BY tablename, policyname;

