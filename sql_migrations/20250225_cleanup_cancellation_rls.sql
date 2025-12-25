-- Clean up ALL cancellation policies and create fresh, simple ones

-- ===== DROP ALL EXISTING POLICIES =====
DROP POLICY IF EXISTS cancellation_policies_select_policy ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_insert_policy ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_update_policy ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_delete_policy ON public.cancellation_policies;
DROP POLICY IF EXISTS cancellation_policies_tenant_access ON public.cancellation_policies;

DROP POLICY IF EXISTS cancellation_rules_select_policy ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_insert_policy ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_update_policy ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_delete_policy ON public.cancellation_rules;
DROP POLICY IF EXISTS cancellation_rules_tenant_access ON public.cancellation_rules;

-- ===== CANCELLATION_POLICIES TABLE =====

-- SELECT: Clients can read global policies and their tenant's policies
CREATE POLICY cancellation_policies_select ON public.cancellation_policies
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL  -- Always allow global policies
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.is_active = true
  )
);

-- INSERT: Only admins/tenant_admins can create
CREATE POLICY cancellation_policies_insert ON public.cancellation_policies
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- UPDATE: Only admins/tenant_admins can update
CREATE POLICY cancellation_policies_update ON public.cancellation_policies
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
)
WITH CHECK (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- DELETE: Only admins/tenant_admins can delete
CREATE POLICY cancellation_policies_delete ON public.cancellation_policies
FOR DELETE
TO authenticated
USING (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- ===== CANCELLATION_RULES TABLE =====

-- SELECT: Clients can read global rules and their tenant's rules
CREATE POLICY cancellation_rules_select ON public.cancellation_rules
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL  -- Always allow global rules
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.is_active = true
  )
);

-- INSERT: Only admins/tenant_admins can create
CREATE POLICY cancellation_rules_insert ON public.cancellation_rules
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- UPDATE: Only admins/tenant_admins can update
CREATE POLICY cancellation_rules_update ON public.cancellation_rules
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
)
WITH CHECK (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- DELETE: Only admins/tenant_admins can delete
CREATE POLICY cancellation_rules_delete ON public.cancellation_rules
FOR DELETE
TO authenticated
USING (
  tenant_id IS NULL
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin', 'tenant_admin'])
      AND users.is_active = true
  )
);

-- Verify result
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('cancellation_policies', 'cancellation_rules')
GROUP BY tablename
ORDER BY tablename;

