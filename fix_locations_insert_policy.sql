-- ULTRA-SIMPLE INSERT: Allow all pickups for now (we'll add restrictions later)

DROP POLICY IF EXISTS "locations_insert" ON public.locations;

-- ============================================================================
-- INSERT: Ultra simple - allow all pickups
-- ============================================================================
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    location_type = 'pickup'
  );

-- Verify
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
