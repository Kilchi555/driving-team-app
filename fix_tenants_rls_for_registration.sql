-- Fix RLS policies for tenants table to allow tenant registration
-- This will resolve the "new row violates row-level security policy" error

-- 1. Check current RLS status and policies
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'tenants';

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;

-- 2. Enable RLS on tenants table (if not already enabled)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to start fresh
DROP POLICY IF EXISTS "tenants_authenticated_access" ON tenants;
DROP POLICY IF EXISTS "tenants_access" ON tenants;
DROP POLICY IF EXISTS "tenants_super_admin_access" ON tenants;
DROP POLICY IF EXISTS "tenants_tenant_admin_access" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to insert tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to select tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to update tenants" ON tenants;

-- 4. Create comprehensive policies for tenants table

-- Policy 1: Allow all authenticated users to view tenants (for tenant selection)
CREATE POLICY "Allow authenticated users to select tenants" ON tenants
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy 2: Allow all authenticated users to insert new tenants (for registration)
CREATE POLICY "Allow authenticated users to insert tenants" ON tenants
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Policy 3: Allow authenticated users to update tenants (for tenant management)
CREATE POLICY "Allow authenticated users to update tenants" ON tenants
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- 5. Verify all policies were created
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY cmd, policyname;

-- 6. Test that the policies work by checking if we can see tenants
SELECT COUNT(*) as tenant_count FROM tenants;

-- 7. Optional: Test insert (this should work now)
-- INSERT INTO tenants (id, name, slug, contact_email, is_active) 
-- VALUES ('test-123', 'Test Tenant', 'test-tenant', 'test@example.com', true);
-- DELETE FROM tenants WHERE id = 'test-123';


