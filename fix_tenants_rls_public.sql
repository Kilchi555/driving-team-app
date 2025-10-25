-- Fix RLS policies for tenants table to allow public access for registration
-- This allows non-authenticated users to access tenant data for registration

-- 1. Enable RLS on tenants table (if not already enabled)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "tenants_authenticated_access" ON tenants;
DROP POLICY IF EXISTS "tenants_access" ON tenants;
DROP POLICY IF EXISTS "tenants_super_admin_access" ON tenants;
DROP POLICY IF EXISTS "tenants_tenant_admin_access" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to insert tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to select tenants" ON tenants;
DROP POLICY IF EXISTS "Allow authenticated users to update tenants" ON tenants;
DROP POLICY IF EXISTS "Allow public access to active tenants" ON tenants;

-- 3. Create comprehensive policies for tenants table

-- Policy 1: Allow public access to view active tenants (for registration and branding)
CREATE POLICY "Allow public access to active tenants" ON tenants
    FOR SELECT 
    TO public 
    USING (is_active = true);

-- Policy 2: Allow authenticated users to view all tenants
CREATE POLICY "Allow authenticated users to select tenants" ON tenants
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy 3: Allow authenticated users to insert new tenants (for registration)
CREATE POLICY "Allow authenticated users to insert tenants" ON tenants
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Policy 4: Allow authenticated users to update tenants (for tenant management)
CREATE POLICY "Allow authenticated users to update tenants" ON tenants
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);


