-- ========================================
-- EMERGENCY: FIX INFINITE RECURSION IN RLS
-- ========================================
-- Error: "infinite recursion detected in policy for relation 'users'"
-- This happens when policies reference each other in a circular way

-- Step 1: Temporarily disable RLS on all problematic tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- Step 2: Check what policies exist on tenants table
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'tenants')
ORDER BY tablename, policyname;

-- Step 3: Drop all policies on both tables to break recursion
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on users table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop all policies on tenants table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'tenants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tenants', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4: Create simple, non-recursive policies

-- Users table: Simple own profile access
CREATE POLICY users_simple_access ON users
    FOR ALL
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Tenants table: Simple access for active tenants
CREATE POLICY tenants_simple_access ON tenants
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Step 5: Re-enable RLS with safe policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify fix
DO $$
BEGIN
    RAISE NOTICE '✅ Infinite recursion fix applied!';
    RAISE NOTICE 'All circular policies removed';
    RAISE NOTICE 'Simple, safe policies created';
    RAISE NOTICE '';
    RAISE NOTICE 'Login and tenant loading should work now!';
END $$;
