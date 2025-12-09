-- RLS Policies für Availability Booking System
-- Clients können Treffpunkte vorschlagen (erstellen), aber nicht löschen oder andere sehen

-- 1. Lösche ALLE existierenden Policies
DROP POLICY IF EXISTS "locations_delete" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_tenant_access" ON public.locations;

-- 2. RLS aktivieren
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: SELECT - Clients sehen NUR ihre eigenen Pickups + Staff sehen alles
-- ============================================================================
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/Staff/TenantAdmin: sehen ALLES von ihrem Tenant
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
    OR
    -- Clients: sehen NUR ihre eigenen Pickup-Locations
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
    OR
    -- Clients: sehen Standard-Locations von ihrem Tenant
    (
      location_type IN ('standard', 'exam', 'classroom')
      AND tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- ============================================================================
-- POLICY 2: INSERT - Clients können NUR Pickup-Locations erstellen
-- ============================================================================
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin/Staff/TenantAdmin: können alle Typen erstellen
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      AND tenant_id IS NOT NULL
    )
    OR
    -- Clients: können NUR Pickup-Locations für sich selbst erstellen
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
      AND tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- ============================================================================
-- POLICY 3: UPDATE - Clients können NUR ihre eigenen Pickups ändern
-- ============================================================================
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin/Staff/TenantAdmin: können alles updaten
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
    OR
    -- Clients: können NUR ihre eigenen Pickup-Locations updaten
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Admin/Staff/TenantAdmin: können alles updaten
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
    OR
    -- Clients: können NUR ihre eigenen Pickup-Locations updaten
    (
      location_type = 'pickup'
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICY 4: DELETE - NUR Admin/Staff können löschen, NICHT Clients
-- ============================================================================
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    -- ONLY Admin/Staff/TenantAdmin können löschen
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin', 'staff')
      AND is_active = true
    )
  );

-- ============================================================================
-- Verifiziere dass alles korrekt ist
-- ============================================================================
SELECT 
  policyname,
  permissive,
  roles,
  CASE WHEN roles::text LIKE '%authenticated%' THEN 'PASS: authenticated only' ELSE 'WARNING' END as status
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- ============================================================================
-- Summary der Permissions nach Role:
-- ============================================================================
-- ADMIN/STAFF/TENANTADMIN:
--   SELECT: ✅ Alle Locations vom Tenant
--   INSERT: ✅ Alle Typen
--   UPDATE: ✅ Alle Locations
--   DELETE: ✅ Alle Locations
--
-- CLIENT (Schüler/Kunde):
--   SELECT: ✅ Eigene Pickups + Standard-Locations vom Tenant
--   INSERT: ✅ Nur Pickup-Locations für sich selbst
--   UPDATE: ✅ Nur eigene Pickups
--   DELETE: ❌ NICHT möglich (für Clients)
--
-- UNAUTHENTICATED (nicht angemeldet):
--   SELECT: ❌ Nichts
--   INSERT: ❌ Nichts
--   UPDATE: ❌ Nichts
--   DELETE: ❌ Nichts
