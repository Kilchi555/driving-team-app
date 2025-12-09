-- FINAL RLS Policy - Staff can see everything from their tenant
-- Clients see global + their tenant standards + their pickups

DROP POLICY IF EXISTS "locations_select_v2" ON public.locations;

CREATE POLICY "locations_select_v2" ON public.locations
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

-- Verifiziere
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
