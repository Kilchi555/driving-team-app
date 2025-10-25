// server/api/admin/fix-tenants-rls.post.ts
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // SQL to fix tenants RLS policies
    const sql = `
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

      -- 3. Create comprehensive policies for tenants table

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
    `
    
    // Test current tenant access
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug, is_active')
      .limit(5)
    
    return {
      success: true,
      message: 'Tenants RLS policies need to be fixed manually',
      sqlToExecute: sql,
      currentTenantAccess: tenantsError ? 'BLOCKED' : 'ALLOWED',
      tenantsFound: tenants?.length || 0,
      tenants: tenants,
      error: tenantsError?.message
    }
    
  } catch (error: any) {
    console.error('Error fixing tenants RLS:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
