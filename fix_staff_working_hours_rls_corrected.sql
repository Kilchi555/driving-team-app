-- Fix RLS Policies for staff_working_hours table
-- Problem: RLS Policy compares auth.uid() with staff_id, but should compare with auth_user_id
-- Erstellt: 2025-01-27

-- 1. Bestehende Policies löschen
DROP POLICY IF EXISTS "Staff can manage their own working hours" ON staff_working_hours;
DROP POLICY IF EXISTS "Admins can view all working hours" ON staff_working_hours;

-- 2. Korrigierte RLS Policies erstellen
-- Policy: Staff können ihre eigenen Arbeitszeiten verwalten
-- Vergleicht auth.uid() mit der auth_user_id in der users Tabelle
CREATE POLICY "Staff can manage their own working hours" ON staff_working_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = staff_working_hours.staff_id 
      AND users.auth_user_id = auth.uid()
    )
  );

-- Policy: Admins können alle Arbeitszeiten sehen
CREATE POLICY "Admins can view all working hours" ON staff_working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Policies testen
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

-- 4. Test-Query um zu prüfen ob die Policy funktioniert
-- Diese Query sollte nur die Arbeitszeiten des aktuellen Users zurückgeben
SELECT 
  swh.*,
  u.first_name,
  u.last_name,
  u.auth_user_id,
  auth.uid() as current_auth_uid
FROM staff_working_hours swh
JOIN users u ON u.id = swh.staff_id
WHERE u.auth_user_id = auth.uid();
