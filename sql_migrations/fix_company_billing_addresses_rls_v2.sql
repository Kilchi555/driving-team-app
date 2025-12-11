-- Fix company_billing_addresses RLS - simplified version
-- The issue: Staff creates addresses for students, but RLS blocks it
-- We need to check if Staff is creating for a student in their tenant

DROP POLICY IF EXISTS "company_billing_addresses_select" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_insert" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_update" ON company_billing_addresses;
DROP POLICY IF EXISTS "company_billing_addresses_delete" ON company_billing_addresses;

ALTER TABLE company_billing_addresses ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
CREATE POLICY "company_billing_addresses_select"
ON company_billing_addresses FOR SELECT
TO authenticated
USING (
  -- User can see their own addresses
  (user_id = auth.uid())
  OR
  -- Staff/Admin can see all addresses for their tenant (regardless of user_id)
  (
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

-- Policy 2: INSERT
-- Staff can create addresses for students in their tenant
CREATE POLICY "company_billing_addresses_insert"
ON company_billing_addresses FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create their own address (user_id = auth.uid() doesn't apply here since auth.uid() is auth_user_id)
  -- We need to check if the current auth user is the owner OR is staff for that tenant
  (
    -- Case 1: Staff creating for a student in their tenant
    EXISTS (
      SELECT 1
      FROM users u
      WHERE (
        u.auth_user_id = auth.uid()
        AND u.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND u.is_active = true
        AND company_billing_addresses.tenant_id = u.tenant_id
      )
    )
  )
  OR
  (
    -- Case 2: Student creating their own address
    -- The user_id in company_billing_addresses matches the current user's ID from users table
    user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Policy 3: UPDATE
CREATE POLICY "company_billing_addresses_update"
ON company_billing_addresses FOR UPDATE
TO authenticated
USING (
  -- Can update if staff in same tenant OR own address
  (
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
  OR
  (
    user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
)
WITH CHECK (
  -- Same conditions for update
  (
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
  OR
  (
    user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Policy 4: DELETE
CREATE POLICY "company_billing_addresses_delete"
ON company_billing_addresses FOR DELETE
TO authenticated
USING (
  -- Can delete if staff in same tenant OR own address
  (
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
  OR
  (
    user_id = (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- Verify
-- SELECT policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'company_billing_addresses'
-- ORDER BY policyname;

