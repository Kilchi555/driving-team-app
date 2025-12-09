-- Sicherheits-Audit für Production
-- Überprüfe dass RLS richtig konfiguriert ist

-- 1. Überprüfe dass ALLE Policies auf "authenticated" sind
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  CASE 
    WHEN 'authenticated' = ANY(roles) THEN 'PASS: authenticated'
    WHEN 'public' = ANY(roles) THEN 'FAIL: public (Sicherheitsrisiko!)'
    ELSE 'WARNING: Unerwartete Rolle'
  END as security_status
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY tablename, policyname;

-- 2. Überprüfe dass RLS aktiviert ist
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity = true THEN 'PASS: RLS enabled' ELSE 'FAIL: RLS disabled' END as status
FROM pg_tables 
WHERE tablename IN ('locations', 'users', 'appointments', 'payments', 'tenants');

-- 3. Überprüfe dass kritische Tabellen RLS haben
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT DISTINCT tablename FROM pg_policies
)
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'information_schema.%'
ORDER BY tablename;
-- ^ Falls hier Tabellen auftauchen = WARNUNG: Diese Tabellen haben KEINE RLS Policies!

-- 4. Test: Versuche als NICHT-authentifizierter Benutzer zu lesen (sollte fehlschlagen)
-- Dieser Query funktioniert nur wenn RLS richtig funktioniert
-- SELECT COUNT(*) as location_count FROM public.locations;

-- 5. Überprüfe ob unauthentifizierte Zugriffe durch RLS geblockt werden
SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'locations'
AND policyname LIKE 'locations_%'
ORDER BY policyname;

