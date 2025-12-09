-- Fix RLS policies for locations table to allow clients (students) to create pickup locations
-- This allows students to create their own pickup locations while maintaining tenant isolation

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;

-- 2. Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. SELECT policy - users can see locations from their tenant
CREATE POLICY "locations_select_policy" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- 4. INSERT policy - allow both admins/staff AND clients to create locations
--    - Admins and staff can create standard/staff locations
--    - Clients can create pickup locations (for themselves)
CREATE POLICY "locations_insert_policy" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Allow admins/staff to create any type of location
      (location_type IN ('standard', 'exam', 'classroom', 'staff') 
       AND EXISTS (
         SELECT 1 FROM public.users 
         WHERE auth_user_id = auth.uid() 
         AND role IN ('admin', 'tenant_admin', 'staff')
         AND is_active = true
       ))
      -- OR allow clients to create pickup locations for themselves
      OR (location_type = 'pickup' 
          AND user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() AND is_active = true
          ))
    )
  );

-- 5. UPDATE policy - allow users to update their own pickup locations or admins to update all
CREATE POLICY "locations_update_policy" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Allow admins/staff to update any location
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      -- OR allow users to update their own pickup locations
      OR (location_type = 'pickup' 
          AND user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() AND is_active = true
          ))
    )
  );

-- 6. DELETE policy - allow admins to delete, users to delete their own pickup locations
CREATE POLICY "locations_delete_policy" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Allow admins/staff to delete any location
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      -- OR allow users to delete their own pickup locations
      OR (location_type = 'pickup' 
          AND user_id IN (
            SELECT id FROM public.users 
            WHERE auth_user_id = auth.uid() AND is_active = true
          ))
    )
  );

-- 7. Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

