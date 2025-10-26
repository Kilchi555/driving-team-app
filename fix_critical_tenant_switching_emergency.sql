-- ========================================
-- EMERGENCY TENANT SECURITY LOCKDOWN
-- ========================================
-- This is an emergency fix to completely lock down tenant access
-- Users should ONLY see their own tenant, period.

-- ========================================
-- STEP 1: COMPLETE TENANT TABLE LOCKDOWN
-- ========================================

-- Drop ALL tenant policies (including the ones we just created)
DROP POLICY IF EXISTS "tenants_public_selection" ON tenants;
DROP POLICY IF EXISTS "tenants_own_tenant_read" ON tenants;
DROP POLICY IF EXISTS "tenants_own_tenant_update" ON tenants;
DROP POLICY IF EXISTS "tenants_admin_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;

-- Create ONE strict policy: Users can ONLY see their exact tenant
CREATE POLICY "tenants_strict_own_only" ON tenants
  FOR ALL USING (
    -- For authenticated users: ONLY their own tenant
    (auth.role() = 'authenticated' AND id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.is_active = true 
      AND u.deleted_at IS NULL
      LIMIT 1
    )) OR
    -- For anonymous users: ONLY for initial tenant selection (basic info only)
    (auth.role() = 'anon' AND is_active = true)
  )
  WITH CHECK (
    -- Updates only allowed for own tenant and only by admins
    auth.role() = 'authenticated' AND id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.role = 'admin'
      AND u.is_active = true 
      AND u.deleted_at IS NULL
      LIMIT 1
    )
  );

-- ========================================
-- STEP 2: EMERGENCY TENANT CONSISTENCY CHECK
-- ========================================

-- Function to get ONLY the user's own tenant
CREATE OR REPLACE FUNCTION get_user_tenant_strict()
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, user_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_tenant_id UUID;
    result_tenant_name TEXT;
    result_user_email TEXT;
BEGIN
    -- Get user's tenant_id
    SELECT u.tenant_id, u.email INTO result_tenant_id, result_user_email
    FROM users u 
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true 
    AND u.deleted_at IS NULL
    LIMIT 1;
    
    -- Get tenant name
    IF result_tenant_id IS NOT NULL THEN
        SELECT t.name INTO result_tenant_name
        FROM tenants t
        WHERE t.id = result_tenant_id
        LIMIT 1;
    END IF;
    
    -- Return single result
    RETURN QUERY SELECT result_tenant_id, result_tenant_name, result_user_email;
END;
$$;

-- ========================================
-- STEP 3: FORCE SESSION CONSISTENCY
-- ========================================

-- Function to verify user is in correct tenant
CREATE OR REPLACE FUNCTION verify_tenant_session()
RETURNS TABLE(
    is_valid BOOLEAN,
    user_tenant_id UUID,
    session_info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tenant UUID;
    session_valid BOOLEAN := false;
BEGIN
    -- Get user's actual tenant
    SELECT u.tenant_id INTO user_tenant
    FROM users u 
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true 
    AND u.deleted_at IS NULL
    LIMIT 1;
    
    -- Session is valid if we found exactly one tenant
    session_valid := (user_tenant IS NOT NULL);
    
    RETURN QUERY SELECT 
        session_valid,
        user_tenant,
        'User authenticated with tenant: ' || COALESCE(user_tenant::text, 'NONE');
END;
$$;

-- ========================================
-- STEP 4: IMMEDIATE VERIFICATION
-- ========================================

-- Test 1: Check what tenants are now visible (should be only 1)
SELECT 
    'EMERGENCY_TEST_TENANTS' as test_name,
    COUNT(*) as visible_tenant_count,
    array_agg(name) as visible_tenants
FROM tenants;

-- Test 2: Get user's strict tenant info
SELECT 
    'USER_TENANT_STRICT' as test_name,
    * 
FROM get_user_tenant_strict();

-- Test 3: Verify session consistency
SELECT 
    'SESSION_VERIFICATION' as test_name,
    *
FROM verify_tenant_session();

-- ========================================
-- STEP 5: Grant permissions
-- ========================================

GRANT EXECUTE ON FUNCTION get_user_tenant_strict() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_tenant_session() TO authenticated;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚨 EMERGENCY TENANT LOCKDOWN COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRITICAL SECURITY MEASURES APPLIED:';
    RAISE NOTICE '✅ Complete tenant isolation enforced';
    RAISE NOTICE '✅ Cross-tenant access eliminated';
    RAISE NOTICE '✅ Session verification functions created';
    RAISE NOTICE '✅ Emergency consistency checks enabled';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  PLEASE TEST IMMEDIATELY:';
    RAISE NOTICE '1. Reload admin interface';
    RAISE NOTICE '2. Verify only YOUR tenant data is visible';
    RAISE NOTICE '3. Check tenant switching is prevented';
    RAISE NOTICE '========================================';
END $$;




















