-- Fix RLS policies to allow reading global cancellation policies (tenant_id = NULL)

-- Step 1: Fix cancellation_policies table
DROP POLICY IF EXISTS cancellation_policies_select_policy ON public.cancellation_policies;

CREATE POLICY cancellation_policies_select_policy ON public.cancellation_policies
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL  -- Global policies are always readable
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.is_active = true
  )
);

-- Step 2: Fix cancellation_rules table (SAME ISSUE!)
DROP POLICY IF EXISTS cancellation_rules_select_policy ON public.cancellation_rules;

CREATE POLICY cancellation_rules_select_policy ON public.cancellation_rules
FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL  -- Global rules are always readable
  OR
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE users.auth_user_id = auth.uid()
      AND users.is_active = true
  )
);

-- Step 3: Verify both policies
SELECT 
  tablename,
  policyname, 
  substring(qual from 1 for 100) as qual_preview
FROM pg_policies 
WHERE tablename IN ('cancellation_policies', 'cancellation_rules')
  AND policyname LIKE '%_select_policy'
ORDER BY tablename;

