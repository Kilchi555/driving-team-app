-- SQL-Befehl zum Ausführen in der Supabase-Produktionsdatenbank
-- Gehe zu: https://unyjaetebnaexaflpyoc.supabase.co/project/default/sql
-- Führe diesen Befehl aus:

-- 1. Bestehende Policies löschen
DROP POLICY IF EXISTS "Appointment discounts are insertable by staff" ON appointment_discounts;
DROP POLICY IF EXISTS "Appointment discounts are updatable by staff" ON appointment_discounts;
DROP POLICY IF EXISTS "Appointment discounts are deletable by staff" ON appointment_discounts;
DROP POLICY IF EXISTS "Appointment discounts are insertable by authenticated users" ON appointment_discounts;
DROP POLICY IF EXISTS "Appointment discounts are updatable by authenticated users" ON appointment_discounts;
DROP POLICY IF EXISTS "Appointment discounts are deletable by authenticated users" ON appointment_discounts;

-- 2. Neue, funktionierende Policies erstellen
CREATE POLICY "Appointment discounts are insertable by authenticated users" ON appointment_discounts 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Appointment discounts are updatable by authenticated users" ON appointment_discounts 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Appointment discounts are deletable by authenticated users" ON appointment_discounts 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Bestätigung
SELECT 'RLS-Policies wurden erfolgreich aktualisiert!' as status;

-- ✅ SOFT DELETE RLS POLICIES
-- Alle bestehenden Policies müssen gelöschte Termine ausschließen

-- Policy für Termine lesen (nur nicht gelöschte)
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT USING (
    (auth.uid() = user_id OR auth.uid() = staff_id) 
    AND deleted_at IS NULL  -- ✅ Nur nicht gelöschte Termine
  );

-- Policy für Termine bearbeiten (nur nicht gelöschte)
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
CREATE POLICY "Users can update their own appointments" ON appointments
  FOR UPDATE USING (
    (auth.uid() = user_id OR auth.uid() = staff_id) 
    AND deleted_at IS NULL  -- ✅ Nur nicht gelöschte Termine
  );

-- Policy für Termine löschen (Soft Delete)
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
CREATE POLICY "Users can delete their own appointments" ON appointments
  FOR UPDATE USING (
    (auth.uid() = user_id OR auth.uid() = staff_id) 
    AND deleted_at IS NULL  -- ✅ Nur nicht gelöschte Termine können "gelöscht" werden
  );

-- Policy für Termine erstellen
DROP POLICY IF EXISTS "Users can insert appointments" ON appointments;
CREATE POLICY "Users can insert appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = staff_id
  );

-- ✅ ADMIN POLICY: Alle Termine sehen (auch gelöschte)
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
CREATE POLICY "Admins can view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ✅ ADMIN POLICY: Gelöschte Termine wiederherstellen
DROP POLICY IF EXISTS "Admins can restore deleted appointments" ON appointments;
CREATE POLICY "Admins can restore deleted appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ✅ ADMIN POLICY: Termine permanent löschen
DROP POLICY IF EXISTS "Admins can permanently delete appointments" ON appointments;
CREATE POLICY "Admins can permanently delete appointments" ON appointments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
