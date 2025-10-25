-- Fix RLS policies for tenant branding updates
-- This ensures that tenant admins can update their own tenant's branding

-- Temporarily disable RLS to create/update policies
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenants_admin_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_select_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_update_policy" ON tenants;

-- Re-enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for tenant management
CREATE POLICY "tenants_admin_all_access" ON tenants
  FOR ALL
  TO authenticated
  USING (
    -- System admins have full access
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    -- Tenant admins can access their own tenant
    (
      (auth.jwt() ->> 'role')::text = 'tenant_admin'
      AND 
      id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    -- System admins can modify everything
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    -- Tenant admins can only modify their own tenant
    (
      (auth.jwt() ->> 'role')::text = 'tenant_admin'
      AND 
      id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Create policy for public tenant selection (for login page)
CREATE POLICY "tenants_public_select" ON tenants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create policy for anonymous access to basic tenant info
CREATE POLICY "tenants_anonymous_select" ON tenants
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Verify policies are working
DO $$
BEGIN
  RAISE NOTICE 'RLS Policies updated successfully!';
  RAISE NOTICE 'Testing policies...';
  
  -- Test if policies exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' 
    AND policyname = 'tenants_admin_all_access'
  ) THEN
    RAISE NOTICE '✅ tenants_admin_all_access policy created';
  ELSE
    RAISE NOTICE '❌ tenants_admin_all_access policy missing';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' 
    AND policyname = 'tenants_public_select'
  ) THEN
    RAISE NOTICE '✅ tenants_public_select policy created';
  ELSE
    RAISE NOTICE '❌ tenants_public_select policy missing';
  END IF;
END $$;



















