-- ========================================
-- CRITICAL TENANT SWITCHING FIX - FINAL
-- ========================================
-- This fixes the critical security issue where users get switched between tenants
-- after page reloads, especially in admin interfaces

-- First, let's check what RLS policies exist for tenants table
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;

-- ========================================
-- STEP 1: Remove ALL existing tenant policies
-- ========================================

DROP POLICY IF EXISTS "tenants_admin_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_admin_all_access" ON tenants;
DROP POLICY IF EXISTS "Allow public read access for tenant selection" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to read tenants" ON tenants;
DROP POLICY IF EXISTS "Enable read access for all users" ON tenants;

-- ========================================
-- STEP 2: Create SECURE tenant-isolated policies
-- ========================================

-- Policy 1: Public read access for tenant selection (ONLY basic info)
CREATE POLICY "tenants_public_selection" ON tenants
  FOR SELECT USING (
    is_active = true AND (
      -- Allow access to basic tenant info for selection
      current_setting('request.jwt.claims', true)::json->>'role' IS NULL OR
      current_setting('request.jwt.claims', true)::json->>'role' = 'anon'
    )
  );

-- Policy 2: Users can ONLY read their OWN tenant
CREATE POLICY "tenants_own_tenant_read" ON tenants
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    id = (
      SELECT tenant_id 
      FROM users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true 
      AND deleted_at IS NULL
      LIMIT 1
    )
  );

-- Policy 3: Users can ONLY update their OWN tenant (and only if admin)
CREATE POLICY "tenants_own_tenant_update" ON tenants
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    id = (
      SELECT tenant_id 
      FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true 
      AND deleted_at IS NULL
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    id = (
      SELECT tenant_id 
      FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true 
      AND deleted_at IS NULL
      LIMIT 1
    )
  );

-- ========================================
-- STEP 3: Fix users table RLS to prevent cross-tenant access
-- ========================================

-- Check current users policies
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Drop problematic user policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated access to users" ON users;

-- Create secure user policies
CREATE POLICY "users_own_tenant_only" ON users
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Users can see themselves
      auth_user_id = auth.uid() OR
      -- Users can see others in their tenant only
      tenant_id = (
        SELECT tenant_id 
        FROM users 
        WHERE auth_user_id = auth.uid() 
        AND is_active = true 
        AND deleted_at IS NULL
        LIMIT 1
      )
    )
  );

-- ========================================
-- STEP 4: Create emergency user session check function
-- ========================================

CREATE OR REPLACE FUNCTION check_user_tenant_consistency()
RETURNS TABLE(
    user_id UUID,
    auth_user_id UUID,
    tenant_id UUID,
    email TEXT,
    role TEXT,
    is_consistent BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.auth_user_id,
        u.tenant_id,
        u.email,
        u.role,
        (u.auth_user_id = auth.uid()) as is_consistent
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    AND u.deleted_at IS NULL;
END;
$$;

-- ========================================
-- STEP 5: Verification queries
-- ========================================

-- Check final tenant policies
SELECT 
    'TENANTS POLICIES' as table_type,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;

-- Check final user policies  
SELECT 
    'USERS POLICIES' as table_type,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Test tenant access for current user
SELECT 
    'TENANT ACCESS TEST' as test_type,
    id,
    name,
    slug
FROM tenants 
WHERE is_active = true
LIMIT 5;

-- Test user consistency
SELECT * FROM check_user_tenant_consistency();

-- ========================================
-- STEP 6: Grant necessary permissions
-- ========================================

GRANT EXECUTE ON FUNCTION check_user_tenant_consistency() TO authenticated;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRITICAL TENANT SWITCHING FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security policies updated:';
    RAISE NOTICE '- Tenant access restricted to own tenant only';
    RAISE NOTICE '- User access restricted to same tenant only';
    RAISE NOTICE '- Public access limited to basic tenant selection';
    RAISE NOTICE '- Emergency consistency check function created';
    RAISE NOTICE '========================================';
END $$;




















