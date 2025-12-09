-- PRODUCTION INSERT Policy: Proper restrictions

DROP POLICY IF EXISTS "locations_insert" ON public.locations;

-- ============================================================================
-- INSERT: Allow pickups with proper role checking
-- ============================================================================
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    location_type = 'pickup'
    AND (
      -- Client creating their own pickup
      user_id = auth.uid()
      OR
      -- Staff/Admin creating pickup for someone else
      -- Check if current user is staff by looking at users table
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
    )
  );

-- Verify
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

