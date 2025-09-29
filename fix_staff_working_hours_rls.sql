-- Fix RLS Policies for staff_working_hours table
-- Erstellt: 2025-01-27

-- 1. Prüfen ob Tabelle existiert
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'staff_working_hours'
);

-- 2. RLS aktivieren falls noch nicht aktiv
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;

-- 3. Bestehende Policies löschen falls vorhanden
DROP POLICY IF EXISTS "Staff can manage their own working hours" ON staff_working_hours;
DROP POLICY IF EXISTS "Admins can view all working hours" ON staff_working_hours;

-- 4. Neue RLS Policies erstellen
-- Policy: Staff können ihre eigenen Arbeitszeiten verwalten
CREATE POLICY "Staff can manage their own working hours" ON staff_working_hours
  FOR ALL USING (auth.uid() = staff_id);

-- Policy: Admins können alle Arbeitszeiten sehen
CREATE POLICY "Admins can view all working hours" ON staff_working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 5. Policies testen
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'staff_working_hours';
