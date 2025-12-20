-- RLS Policy Diagnostic für Silent Failures
-- Führe diese Queries aus, um RLS-Probleme zu diagnose

-- ============================================================
-- 1. DIAGNOSE: Überprüfe ob RLS überhaupt aktiv ist
-- ============================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('courses', 'users')
ORDER BY tablename;

-- Expected Output:
-- courses | true (RLS muss aktiv sein!)
-- users | true

-- ============================================================
-- 2. DIAGNOSE: Alle RLS Policies für courses Tabelle
-- ============================================================
SELECT
    policyname,
    permissive,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'USING ✓' ELSE 'USING ✗' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK ✓' ELSE 'WITH CHECK ✗' END as with_check_clause,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY cmd, policyname;

-- Expected Output für UPDATE Policy:
-- policyname: courses_tenant_update
-- cmd: UPDATE
-- using_clause: USING ✓
-- with_check_clause: WITH CHECK ✓ (WICHTIG!)

-- ============================================================
-- 3. DIAGNOSE: Nur die UPDATE Policy
-- ============================================================
SELECT
    policyname,
    permissive,
    cmd,
    qual as "USING Clause",
    with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'courses' AND cmd = 'UPDATE';

-- ============================================================
-- 4. FIX: Wenn WITH CHECK fehlt, erstelle die Policy neu
-- ============================================================

-- Schritt 1: Lösche die alte Policy
DROP POLICY IF EXISTS "courses_tenant_update" ON public.courses;

-- Schritt 2: Erstelle die neue Policy mit beiden Clauses
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
-- 5. VERIFIZIERUNG: Überprüfe dass die Policy korrekt ist
-- ============================================================
SELECT
    policyname,
    permissive,
    cmd,
    qual as "USING Clause",
    with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'courses' AND policyname = 'courses_tenant_update';

-- Expected:
-- policyname: courses_tenant_update
-- permissive: true (PERMISSIVE = erlaubt, RESTRICTIVE = blockiert)
-- cmd: UPDATE
-- USING Clause: (tenant_id IN ( SELECT ... )) ✓
-- WITH CHECK Clause: (tenant_id IN ( SELECT ... )) ✓

-- ============================================================
-- 6. TEST: Kann der aktuelle User einen Update machen?
-- ============================================================

-- Wenn du im SQL Editor bist und als User authentifiziert:
-- Schritt 1: Finde eine Test-Course-ID
SELECT id, status, status_changed_at FROM courses LIMIT 1;
-- ^ Kopiere die ID aus diesem Result

-- Schritt 2: Probiere einen UPDATE mit der ID (ersetze COURSE_ID unten):
-- UPDATE courses 
-- SET status = 'active', status_changed_at = NOW()
-- WHERE id = 'COURSE_ID'  ← HIER EINSETZEN (z.B. 'e256a7e8-3c2e-4e55-b304-fb3d5d5d2ccb')
-- RETURNING id, status;

-- Wenn der UPDATE funktioniert, ist RLS OK!
-- Wenn Error: "new row violates row-level security policy" → RLS blockiert

-- ============================================================
-- 7. DIAGNOSE: Alle Policies auf courses Tabelle
-- ============================================================
SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Ja' ELSE 'Nein' END as "Hat USING",
    CASE WHEN with_check IS NOT NULL THEN 'Ja' ELSE 'Nein' END as "Hat WITH CHECK"
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY cmd, policyname;

-- ============================================================
-- 8. PROBLEMBEHEBUNG: Wenn RLS nicht aktiv ist
-- ============================================================

-- Aktiviere RLS auf courses Tabelle
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Dann erstelle die Policies neu (siehe Step 1-2)

-- ============================================================
-- 9. TEST: Simulation der Status-Update
-- ============================================================

-- Dieser Query prüft, ob der aktuelle User die courses Tabelle lesen darf:
SELECT COUNT(*) as readable_courses
FROM courses
WHERE tenant_id IN (
  SELECT tenant_id FROM users 
  WHERE auth_user_id = auth.uid() AND is_active = true
);

-- Dieser Query prüft, ob der UPDATE erlaubt wäre:
-- (In der Praxis kann du das nur via Supabase API testen)

-- ============================================================
-- 10. BACKUP: Hole die kompletten Policies für Export
-- ============================================================
-- Diese Queries zeigen die Policies in verschiedenen Formaten

-- Format 1: Kurze Übersicht
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- Format 2: Komplette Clause-Inhalte
SELECT
    policyname,
    cmd,
    qual as "USING Clause",
    with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- ============================================================
-- HÄUFIGE FEHLER
-- ============================================================

-- ❌ Fehler 1: WITH CHECK Clause fehlt
-- Problem: UPDATE sagt "success" aber ändert nichts
-- Lösung: Siehe Step 2 oben (CREATE POLICY mit WITH CHECK)

-- ❌ Fehler 2: RLS ist nicht aktiv
-- Problem: SELECT und UPDATE funktionieren ohne Restrictions
-- Lösung: ALTER TABLE ... ENABLE ROW LEVEL SECURITY

-- ❌ Fehler 3: Falsche Tenant-ID Logik
-- Problem: User kann keine Kurse aus ihrer Tenant sehen/ändern
-- Lösung: Überprüfe ob `tenant_id` in der `users` Tabelle korrekt ist

-- ❌ Fehler 4: Policy hat RESTRICTIVE statt PERMISSIVE
-- Problem: Alles wird blockiert
-- Lösung: Erstelle Policy mit PERMISSIVE (default)

-- ============================================================
-- NOTIZEN
-- ============================================================
-- - Jede RLS Policy für UPDATE braucht sowohl USING als auch WITH CHECK
-- - USING prüft: Darf dieser User die Zeile überhaupt lesen?
-- - WITH CHECK prüft: Darf dieser User die neue Werte schreiben?
-- - Beide müssen erfüllt sein, sonst blockiert RLS

-- ============================================================

