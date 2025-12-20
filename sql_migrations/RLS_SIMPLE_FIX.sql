-- ============================================================
-- RLS STATUS & QUICK FIX
-- ============================================================
-- Dieses Script ist SICHER - keine Funktionen die nicht existieren
-- ============================================================

-- SCHRITT 1: Überprüfe ob RLS aktiv ist
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'courses';

-- Erwartete Ausgabe: rowsecurity = true
-- Wenn false → RLS nicht aktiv!

-- SCHRITT 2: Überprüfe die UPDATE Policy
SELECT
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Hat USING' ELSE 'KEIN USING!' END,
    CASE WHEN with_check IS NOT NULL THEN 'Hat WITH CHECK' ELSE 'KEIN WITH CHECK!' END
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE';

-- Erwartete Ausgabe:
-- policyname: courses_tenant_update
-- cmd: UPDATE
-- Spalte 3: Hat USING
-- Spalte 4: Hat WITH CHECK

-- Wenn Spalte 4 "KEIN WITH CHECK!" zeigt → Policy ist kaputt!

-- SCHRITT 3: FIX - Erstelle die Policy neu (falls nötig)
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

CREATE POLICY "courses_tenant_update" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- SCHRITT 4: Verifiziere dass die Policy jetzt korrekt ist
SELECT
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Hat USING ✓' ELSE 'KEIN USING!' END,
    CASE WHEN with_check IS NOT NULL THEN 'Hat WITH CHECK ✓' ELSE 'KEIN WITH CHECK!' END
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'courses_tenant_update';

-- Wenn beide Spalten "✓" haben → ERFOLG! Die Policy ist jetzt korrekt.
-- Gehe jetzt zurück zur App und teste den Status-Change.

