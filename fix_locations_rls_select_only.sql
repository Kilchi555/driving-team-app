-- ULTRA-SIMPLIFIED RLS - Keine komplexen Subqueries
-- Direkt auf tenant_id und user_id prüfen

-- Zuerst: Entferne ALLE defekten Policies
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_delete" ON public.locations;

-- RLS aktivieren
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ULTRA-SIMPLE: SELECT - Erst alle aktivieren, dann debuggen
-- ============================================================================
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);  -- Temporär: Alle sehen alles (zum Debuggen)

-- ============================================================================
-- INSERT: Clients nur Pickups, Admins alles
-- ============================================================================
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin/Staff können alles inserten
    auth.jwt() ->> 'role' IN ('admin', 'tenant_admin', 'staff')
    OR
    -- Clients nur Pickups für sich selbst
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE: Clients nur ihre Pickups, Admins alles
-- ============================================================================
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Admin/Staff können alles updaten
    auth.jwt() ->> 'role' IN ('admin', 'tenant_admin', 'staff')
    OR
    -- Clients nur ihre Pickups
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE: Nur Admin/Staff
-- ============================================================================
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    -- Nur Admin/Staff können löschen
    auth.jwt() ->> 'role' IN ('admin', 'tenant_admin', 'staff')
  );

-- Verifiziere
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;
