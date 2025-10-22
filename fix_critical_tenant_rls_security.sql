-- CRITICAL FIX: Tenant RLS Security Issue
-- The current policy allows any admin to access any tenant!

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "tenants_admin_all_access" ON tenants;

-- 2. Create secure policies that respect tenant boundaries
CREATE POLICY "tenants_own_tenant_access" ON tenants
  FOR ALL
  TO authenticated
  USING (
    -- Master admin has access to all tenants
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Regular admins can only access their OWN tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND 
      id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    -- Master admin can modify all tenants
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Regular admins can only modify their OWN tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND 
      id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
    )
  );

-- 3. Ensure users table has proper tenant isolation
DROP POLICY IF EXISTS "users_tenant_isolation" ON users;

CREATE POLICY "users_secure_tenant_isolation" ON users
  FOR ALL
  TO authenticated
  USING (
    -- Master admin sees all non-deleted users
    (
      (auth.jwt() ->> 'role')::text = 'master_admin' 
      AND deleted_at IS NULL
    )
    OR
    -- Admins see only users in their tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
      AND deleted_at IS NULL
    )
    OR
    -- Users see only themselves
    (
      auth_user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    -- Master admin can modify any user
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Admins can modify users in their tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
    )
    OR
    -- Users can modify themselves
    auth_user_id = auth.uid()
  );

-- 4. Add policy for discounts with proper tenant isolation
DROP POLICY IF EXISTS "discounts_tenant_isolation" ON discounts;

CREATE POLICY "discounts_secure_tenant_isolation" ON discounts
  FOR ALL
  TO authenticated
  USING (
    -- Master admin sees all
    (auth.jwt() ->> 'role')::text = 'master_admin'
    OR
    -- Admins see discounts in their tenant
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin')
      AND tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
    )
    OR
    -- Regular users see discounts in their tenant
    (
      tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid() 
          AND u.is_active = true 
          AND u.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    -- Only admins can create/modify discounts
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'tenant_admin', 'master_admin')
      AND (
        -- Master admin can modify any
        (auth.jwt() ->> 'role')::text = 'master_admin'
        OR
        -- Tenant admins can only modify in their tenant
        tenant_id = (
          SELECT u.tenant_id 
          FROM users u 
          WHERE u.auth_user_id = auth.uid() 
            AND u.is_active = true 
            AND u.deleted_at IS NULL
        )
      )
    )
  );

-- 5. Verification
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SECURITY FIX APPLIED ===';
    RAISE NOTICE '';
    
    -- Count new policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'tenants' 
      AND policyname IN ('tenants_own_tenant_access');
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Secure tenant policy created';
    ELSE
        RAISE NOTICE '❌ Failed to create secure tenant policy';
    END IF;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' 
      AND policyname = 'users_secure_tenant_isolation';
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Secure users policy created';
    ELSE
        RAISE NOTICE '❌ Failed to create secure users policy';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'CRITICAL: The previous policy allowed any admin to access any tenant!';
    RAISE NOTICE 'This has been fixed. Admins can now only access their own tenant.';
    RAISE NOTICE '';
END $$;

















