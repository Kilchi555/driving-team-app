-- Umfassender RLS-Diagnose und Fix für locations Tabelle
-- Dieses Script testet und behebt alle RLS-Probleme

-- 1. Zeige alle existierenden Policies auf locations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  CASE WHEN qual IS NOT NULL THEN 'SELECT/DELETE' ELSE 'INSERT/UPDATE' END as operation_type
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- 2. Überprüfe RLS Status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'locations';

-- 3. Lösche ALLE existierenden Policies um sicherzustellen, dass wir mit einem sauberen Slate beginnen
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_tenant_access" ON public.locations;

-- 4. Stelle sicher, dass RLS aktiviert ist
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 5. Erstelle NEUE, vereinfachte und robustere Policies

-- Policy 1: SELECT - alle Benutzer können Locations ihres Tenants sehen
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Policy 2: INSERT - mit vereinfachter Logik
--    Admin/Staff/TenantAdmin: alle Locations
--    Client: nur Pickup-Locations für sich selbst
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Zuerst: Tenant-Check (MUSS passen)
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Erlaubnis 1: Admin/Staff/TenantAdmin können alle Typen erstellen
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      OR
      -- Erlaubnis 2: Alle anderen (Clients) können NUR Pickup erstellen für sich
      (
        location_type = 'pickup'
        AND user_id = (
          SELECT id FROM public.users 
          WHERE auth_user_id = auth.uid() 
          AND is_active = true
          LIMIT 1
        )
      )
    )
  );

-- Policy 3: UPDATE - mit vereinfachter Logik
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    -- USING clause (vor Update - alte Daten)
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    -- WITH CHECK clause (nach Update - neue Daten)
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Admin/Staff/TenantAdmin können alle updaten
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      OR
      -- Clients können nur ihre eigenen Pickup-Locations updaten
      (
        location_type = 'pickup'
        AND user_id = (
          SELECT id FROM public.users 
          WHERE auth_user_id = auth.uid() 
          AND is_active = true
          LIMIT 1
        )
      )
    )
  );

-- Policy 4: DELETE - mit vereinfachter Logik
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
    AND (
      -- Admin/Staff/TenantAdmin können alle löschen
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin', 'staff')
        AND is_active = true
      )
      OR
      -- Clients können nur ihre eigenen Pickup-Locations löschen
      (
        location_type = 'pickup'
        AND user_id = (
          SELECT id FROM public.users 
          WHERE auth_user_id = auth.uid() 
          AND is_active = true
          LIMIT 1
        )
      )
    )
  );

-- 6. Verifiziere dass alle Policies erstellt wurden
SELECT 
  policyname,
  permissive,
  roles,
  CASE WHEN qual IS NOT NULL THEN 'HAS QUAL' ELSE 'NO QUAL' END as has_qual
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY policyname;

-- 7. Test: Überprüfe eine spezifische Zeile
-- Ersetze die UUID mit einer echten User ID aus deiner Datenbank
-- SELECT * FROM public.locations WHERE user_id = '<TEST_USER_ID>' LIMIT 1;

