-- ============================================
-- FINAL SIMPLE SOLUTION for user_documents RLS
-- Uses LEFT JOIN instead of subqueries to avoid RLS issues
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_documents_select" ON user_documents;
DROP POLICY IF EXISTS "user_documents_insert" ON user_documents;
DROP POLICY IF EXISTS "user_documents_update" ON user_documents;
DROP POLICY IF EXISTS "user_documents_delete" ON user_documents;

-- ============================================
-- APPROACH: Since users SELECT policy is permissive (is_active = true),
-- we can use a different strategy with app-level tenant_id
-- ============================================

-- Helper function using LANGUAGE sql (lighter than plpgsql)
CREATE OR REPLACE FUNCTION current_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Test the functions
SELECT 
  current_user_business_id() as my_id,
  current_user_role() as my_role,
  current_user_tenant_id() as my_tenant;

-- CREATE POLICIES using simple functions

-- SELECT: Own docs OR (staff/admin AND same tenant)
CREATE POLICY "user_documents_select" ON user_documents
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL 
    AND (
      user_id = current_user_business_id()
      OR 
      (
        current_user_role() IN ('admin', 'staff')
        AND tenant_id = current_user_tenant_id()
      )
    )
  );

-- INSERT: Own docs OR (staff/admin AND same tenant)
CREATE POLICY "user_documents_insert" ON user_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = current_user_business_id()
    OR 
    (
      current_user_role() IN ('admin', 'staff')
      AND tenant_id = current_user_tenant_id()
    )
  );

-- UPDATE: Own docs OR (staff/admin AND same tenant)
CREATE POLICY "user_documents_update" ON user_documents
  FOR UPDATE
  TO authenticated
  USING (
    user_id = current_user_business_id()
    OR 
    (
      current_user_role() IN ('admin', 'staff')
      AND tenant_id = current_user_tenant_id()
    )
  )
  WITH CHECK (
    user_id = current_user_business_id()
    OR 
    (
      current_user_role() IN ('admin', 'staff')
      AND tenant_id = current_user_tenant_id()
    )
  );

-- DELETE: Own docs OR (staff/admin AND same tenant)
CREATE POLICY "user_documents_delete" ON user_documents
  FOR DELETE
  TO authenticated
  USING (
    user_id = current_user_business_id()
    OR 
    (
      current_user_role() IN ('admin', 'staff')
      AND tenant_id = current_user_tenant_id()
    )
  );

-- Final test
SELECT 
  'Test Upload Simulation' as test,
  current_user_business_id() as my_id,
  current_user_role() as my_role,
  current_user_tenant_id() as my_tenant,
  -- Simulate Heidi's document
  'eebdff84-b759-4221-80a5-3ce0c6c64b27'::uuid = current_user_business_id() as is_my_doc,
  current_user_role() IN ('admin', 'staff') as i_am_staff,
  '64259d68-195a-4c68-8875-f1b44d962830'::uuid = current_user_tenant_id() as same_tenant,
  -- Final check
  (
    'eebdff84-b759-4221-80a5-3ce0c6c64b27'::uuid = current_user_business_id()
    OR 
    (
      current_user_role() IN ('admin', 'staff')
      AND '64259d68-195a-4c68-8875-f1b44d962830'::uuid = current_user_tenant_id()
    )
  ) as insert_would_be_allowed;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'user_documents'
ORDER BY cmd, policyname;

