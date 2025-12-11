-- Cleanup and fix RLS policies for company_billing_addresses table
-- Issue: Multiple conflicting policies, some with {public} role

-- Drop ALL existing policies
DROP POLICY IF EXISTS "billing_addresses_insert_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "billing_addresses_select_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "billing_addresses_update_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_delete_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_insert_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_select_policy" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_tenant_access" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_update_policy" ON company_billing_addresses;

-- Ensure RLS is enabled
ALTER TABLE company_billing_addresses ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can see their own addresses OR staff/admin can see all addresses for their tenant
CREATE POLICY "company_billing_addresses_select"
ON company_billing_addresses FOR SELECT
TO authenticated
USING (
  -- User can see their own address
  (user_id = auth.uid())
  -- OR: Staff/Admin can see all addresses for their tenant
  OR (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE (
        users.auth_user_id = auth.uid()
        AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND users.is_active = true
      )
    )
  )
);

-- Policy 2: INSERT - Users can create their own addresses OR staff/admin can create for students in their tenant
CREATE POLICY "company_billing_addresses_insert"
ON company_billing_addresses FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create their own address
  (user_id = auth.uid())
  -- OR: Staff/Admin can create addresses for students in their tenant
  OR (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE (
        u.id = company_billing_addresses.user_id
        AND u.tenant_id IN (
          SELECT users.tenant_id
          FROM users
          WHERE (
            users.auth_user_id = auth.uid()
            AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
            AND users.is_active = true
          )
        )
      )
    )
  )
);

-- Policy 3: UPDATE - Users can update their own addresses OR staff/admin can update for their tenant
CREATE POLICY "company_billing_addresses_update"
ON company_billing_addresses FOR UPDATE
TO authenticated
USING (
  -- User can update their own address
  (user_id = auth.uid())
  -- OR: Staff/Admin can update addresses for students in their tenant
  OR (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE (
        users.auth_user_id = auth.uid()
        AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND users.is_active = true
      )
    )
  )
)
WITH CHECK (
  -- User can update their own address
  (user_id = auth.uid())
  -- OR: Staff/Admin can update addresses for students in their tenant
  OR (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE (
        users.auth_user_id = auth.uid()
        AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND users.is_active = true
      )
    )
  )
);

-- Policy 4: DELETE - Users can delete their own addresses OR staff/admin can delete for their tenant
CREATE POLICY "company_billing_addresses_delete"
ON company_billing_addresses FOR DELETE
TO authenticated
USING (
  -- User can delete their own address
  (user_id = auth.uid())
  -- OR: Staff/Admin can delete addresses for students in their tenant
  OR (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE (
        users.auth_user_id = auth.uid()
        AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND users.is_active = true
      )
    )
  )
);

-- Verify policies
-- SELECT policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'company_billing_addresses'
-- ORDER BY policyname;

