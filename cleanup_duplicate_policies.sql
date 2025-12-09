-- SIMPLE CLEANUP: Just remove all old policies and keep the good ones

-- Remove ALL old policies (they may or may not exist)
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_delete" ON public.locations;
DROP POLICY IF EXISTS "locations_select_v2" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_v2" ON public.locations;
DROP POLICY IF EXISTS "locations_update_v2" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_v2" ON public.locations;

-- Now create the FINAL policies fresh

-- ============================================================================
-- SELECT: Global + Staff sees all tenant + Clients see standards + own pickups
-- ============================================================================
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Global locations (tenant_id IS NULL) - everyone can see
    (tenant_id IS NULL)
    OR
    -- 2. Staff sees EVERYTHING from their tenant
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
        AND users.tenant_id = locations.tenant_id
      )
    )
    OR
    -- 3. Clients: Standard-Locations from their tenant
    (
      user_id IS NULL
      AND tenant_id = (
        SELECT tenant_id FROM public.users 
        WHERE id = auth.uid()
        AND is_active = true
        LIMIT 1
      )
    )
    OR
    -- 4. Clients: Their own Pickups
    (user_id = auth.uid())
  );

-- ============================================================================
-- INSERT: Clients only pickups, Staff/Admin can insert anything
-- ============================================================================
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
      LIMIT 1
    )
    OR
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
      AND tenant_id = (
        SELECT tenant_id FROM public.users 
        WHERE id = auth.uid()
        AND is_active = true
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- UPDATE: Clients only their pickups, Staff/Admin can update anything
-- ============================================================================
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
      LIMIT 1
    )
    OR
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE: Only Staff/Admin can delete
-- ============================================================================
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
      LIMIT 1
    )
  );

-- ============================================================================
-- VERIFY: Should have exactly 4 policies
-- ============================================================================
SELECT 
  policyname,
  permissive,
  roles,
  COUNT(*) OVER () as total_policies
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
