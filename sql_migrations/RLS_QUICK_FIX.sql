-- ============================================================
-- RLS QUICK FIX - EINFACH UND SICHER
-- ============================================================

-- SCHRITT 1: Überprüfe die UPDATE Policy
SELECT
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN '✓ USING vorhanden' ELSE '✗ KEIN USING' END as using_status,
    CASE WHEN with_check IS NOT NULL THEN '✓ WITH CHECK vorhanden' ELSE '✗ KEIN WITH CHECK' END as with_check_status
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'courses_tenant_update';

-- Erwartet: Beide Spalten zeigen ✓
-- Wenn ✗ angezeigt: Policy ist kaputt, gehe zu SCHRITT 2

-- ============================================================
-- SCHRITT 2: FIX - Erstelle die Policy neu
-- ============================================================

-- Lösche die alte Policy
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

-- Erstelle die neue Policy mit USING und WITH CHECK
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

-- ============================================================
-- SCHRITT 3: Verifiziere dass die Policy korrekt ist
-- ============================================================

SELECT
    policyname,
    cmd,
    CASE WHEN qual IS NOT NULL THEN '✓ USING vorhanden' ELSE '✗ KEIN USING' END as using_status,
    CASE WHEN with_check IS NOT NULL THEN '✓ WITH CHECK vorhanden' ELSE '✗ KEIN WITH CHECK' END as with_check_status
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'courses_tenant_update';

-- Beide sollten jetzt ✓ zeigen!
-- Wenn ja → Status-Change sollte jetzt funktionieren
-- Wenn nein → Etwas ist immer noch falsch

