-- ============================================================
-- RLS DIAGNOSTIC & FIX SCRIPT (SAFE VERSION)
-- ============================================================
-- Dieses Script kann direkt ausgeführt werden - keine Platzhalter!
-- ============================================================

-- ============================================================
-- SCHRITT 1: DIAGNOSE - Ist RLS aktiv?
-- ============================================================
-- Führe dies aus:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('courses', 'users')
ORDER BY tablename;

-- Erwartet: rowsecurity = true für beide Tabellen
-- Wenn false: RLS ist NICHT aktiv!

-- ============================================================
-- SCHRITT 2: DIAGNOSE - Alle Policies auf courses Tabelle
-- ============================================================
-- Führe dies aus:
SELECT
    policyname,
    permissive,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING ✓' ELSE 'USING ✗' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK ✓' ELSE 'WITH CHECK ✗' END as with_check_clause
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY cmd, policyname;

-- Erwartet für UPDATE:
-- - policyname: courses_tenant_update
-- - cmd: UPDATE
-- - using_clause: USING ✓
-- - with_check_clause: WITH CHECK ✓ (WICHTIG!)

-- Wenn with_check_clause zeigt "✗", dann ist RLS-Policy KAPUTT!
-- → Gehe zu SCHRITT 4 (FIX)

-- ============================================================
-- SCHRITT 3: DIAGNOSE - Nur die UPDATE Policy Details
-- ============================================================
-- Führe dies aus um die komplette Policy zu sehen:
SELECT
    policyname,
    permissive,
    cmd,
    qual as "USING Clause",
    with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'courses_tenant_update';

-- Wenn keine Zeile zurückkommt → Policy existiert NICHT!
-- → Gehe zu SCHRITT 4 (FIX)

-- ============================================================
-- SCHRITT 4: FIX - Erstelle die richtige UPDATE Policy
-- ============================================================
-- WICHTIG: Führe ALLE Schritte nacheinander aus!

-- Schritt 4a: Lösche die alte Policy (falls vorhanden)
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

-- Schritt 4b: Erstelle die neue Policy mit BEIDEN Clauses
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
-- SCHRITT 5: VERIFIZIERUNG - Ist die Policy jetzt korrekt?
-- ============================================================
-- Führe dies aus:
SELECT
    policyname,
    permissive,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING ✓' ELSE 'USING ✗' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK ✓' ELSE 'WITH CHECK ✗' END as with_check_clause
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE' AND policyname = 'courses_tenant_update';

-- Erwartet:
-- - using_clause: USING ✓
-- - with_check_clause: WITH CHECK ✓

-- Wenn beides ✓ ist → FIX ERFOLGREICH! ✅

-- ============================================================
-- SCHRITT 6: OPTIONAL - Aktiviere RLS falls nicht aktiv
-- ============================================================
-- Nur wenn SCHRITT 1 gezeigt hat dass rowsecurity = false!

-- Aktiviere RLS auf courses Tabelle:
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Aktiviere RLS auf users Tabelle:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Dann wiederhole SCHRITT 4 (FIX) um Policies zu erstellen

-- ============================================================
-- SCHRITT 7: TEST - Funktioniert der UPDATE jetzt?
-- ============================================================
-- Gehe zurück zur App und teste:
-- 1. Öffne /admin/courses
-- 2. Ändere den Status eines Kurses
-- 3. Klick "Status ändern"
-- 4. Überprüfe die Logs in der Browser Console

-- Erwartete Logs:
-- ✏️ Step 2: Executing update...
-- ✔️ Step 2b: Verifying update was written to DB...
-- 🔍 Verify result: { statusMatches: true, ... }
-- ✅ Course status updated in DB

-- Wenn statusMatches: false
-- → Die Policy ist immer noch kaputt
-- → Wiederhole SCHRITT 2-5

-- ============================================================
-- SCHNELLE REFERENZ
-- ============================================================

-- Wenn SCHRITT 2 zeigt: WITH CHECK ✗
-- → SCHRITT 4 ausführen

-- Wenn SCHRITT 1 zeigt: rowsecurity = false
-- → SCHRITT 6 + SCHRITT 4 ausführen

-- Wenn alles ✓ aber Problem persistiert
-- → Schreibe mir die Logs!

-- ============================================================
-- KEINE PLATZHALTER!
-- Alle Queries können direkt kopiert und ausgeführt werden.
-- ============================================================

