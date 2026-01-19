-- Fix RLS policies for categories table to allow public/anonymous access
-- This allows unauthenticated users to see categories on public booking pages

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "categories_select_authenticated" ON categories;
DROP POLICY IF EXISTS "categories_select_anon" ON categories;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;

-- Enable RLS if not already
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ANYONE (authenticated or anonymous) to SELECT categories
-- This is safe because categories are public information (lesson types)
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT
  USING (is_active = true); -- Only show active categories

-- Policy 2: Admins can manage categories for their tenant
CREATE POLICY "categories_admin_manage" ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'tenant_admin', 'super_admin')
      AND u.tenant_id = categories.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role IN ('admin', 'tenant_admin', 'super_admin')
      AND u.tenant_id = categories.tenant_id
    )
  );

-- Verify policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY policyname;

