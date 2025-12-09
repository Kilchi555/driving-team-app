-- COMPLETELY NEW RLS - Let's start fresh and simple

-- 1. DISABLE RLS komplett
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;

-- 2. Entferne ALLE Policies
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_delete" ON public.locations;

-- 3. ENABLE RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- START FRESH: Simple, working policies
-- ============================================================================

-- SELECT: Sehr simpel - erst debuggen
CREATE POLICY "locations_select_v2" ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);  -- Temporär: Alles sichtbar zum Debuggen

-- INSERT: Clients nur Pickups, Staff alles
CREATE POLICY "locations_insert_v2" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is staff
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      LIMIT 1
    )
    OR
    -- OR is client creating a pickup
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- UPDATE: Clients nur ihre Pickups, Staff alles
CREATE POLICY "locations_update_v2" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      LIMIT 1
    )
    OR
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- DELETE: Nur Staff
CREATE POLICY "locations_delete_v2" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'tenant_admin', 'staff')
      LIMIT 1
    )
  );

-- Verifiziere
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- SELECT * FROM public.locations LIMIT 1;

