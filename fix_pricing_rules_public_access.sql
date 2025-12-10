-- Fix RLS for pricing_rules table
-- Allow PUBLIC read access to active pricing rules (needed for /services page)
-- Keep write access restricted to authenticated users

-- Step 1: Drop the old SELECT policy
DROP POLICY IF EXISTS "pricing_rules_select_policy" ON pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_tenant_access" ON pricing_rules;

-- Step 2: Create new PUBLIC SELECT policy
-- Allow ANYONE (including anonymous users) to read active pricing rules
CREATE POLICY "pricing_rules_select_public"
ON pricing_rules
FOR SELECT
TO public
USING (is_active = true);

-- Step 3: Create authenticated SELECT policy for admins/staff
-- Allow authenticated users to see ALL pricing rules (including inactive)
CREATE POLICY "pricing_rules_select_authenticated"
ON pricing_rules
FOR SELECT
TO authenticated
USING (
  -- Admin/Staff can see all pricing rules
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin', 'staff')
    AND (users.tenant_id = pricing_rules.tenant_id OR users.tenant_id IS NULL)
  )
);

-- Keep INSERT/UPDATE restricted to authenticated users (no changes needed)
-- pricing_rules_insert_policy and pricing_rules_update_policy remain as-is

-- Verify the new policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies 
WHERE tablename = 'pricing_rules'
ORDER BY cmd, policyname;

