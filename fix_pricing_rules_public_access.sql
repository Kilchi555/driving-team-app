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

-- Step 3: Create authenticated SELECT policy for all authenticated users
-- Allow authenticated users to see active pricing rules for their tenant
CREATE POLICY "pricing_rules_select_authenticated"
ON pricing_rules
FOR SELECT
TO authenticated
USING (
  -- All authenticated users can see active pricing rules for their tenant
  is_active = true
  AND (
    -- Option 1: User belongs to this pricing rule's tenant
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id = pricing_rules.tenant_id
    )
    -- Option 2: Admin/Staff can see all pricing rules
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'tenant_admin', 'staff')
    )
  )
);

-- Keep INSERT/UPDATE restricted to authenticated users with correct auth_user_id reference
-- Note: Uses auth_user_id (not id) to properly match with auth.uid()
-- pricing_rules_insert_policy and pricing_rules_update_policy use correct auth_user_id reference

-- Verify the new policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command
FROM pg_policies 
WHERE tablename = 'pricing_rules'
ORDER BY cmd, policyname;

