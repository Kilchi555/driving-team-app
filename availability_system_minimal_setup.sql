-- Verfügbarkeits-System - Minimale Ergänzungen
-- Erstellt: 2024-12-19
-- Zweck: Ergänzt das bestehende System um Verfügbarkeits-Features
-- Hinweis: Nutzt bestehende Tabellen (users, staff_working_hours, etc.)

-- 1. Locations Tabelle erweitern um category Spalte (Array)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS category VARCHAR(10)[];

-- 1.1. Tenants Tabelle existiert bereits - nur RLS einrichten

-- 1.2. Tenants RLS aktivieren
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 1.3. Tenants RLS Policy (alle authentifizierten Benutzer können sehen)
DROP POLICY IF EXISTS "tenants_access" ON tenants;
CREATE POLICY "tenants_access" ON tenants
  FOR ALL
  TO authenticated
  USING (true);

-- 1.4. Standard-Tenant einfügen (falls noch nicht vorhanden)
INSERT INTO tenants (name, slug, contact_email, business_type, is_active, is_trial, subscription_plan, subscription_status)
VALUES 
  ('Standard Fahrschule', 'default', 'info@standard-fahrschule.ch', 'Fahrschule', true, false, 'basic', 'active'),
  ('Test Fahrschule A', 'test-a', 'info@test-a.ch', 'Fahrschule', true, false, 'basic', 'active'),
  ('Test Fahrschule B', 'test-b', 'info@test-b.ch', 'Fahrschule', true, false, 'premium', 'active')
ON CONFLICT (slug) DO NOTHING;

-- 1.5. Categories Tabelle erweitern um tenant_id (falls noch nicht vorhanden)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- 1.6. Standard-Kategorien für jeden Tenant einfügen
DO $$
DECLARE
  tenant_record RECORD;
  default_tenant_id UUID;
BEGIN
  -- Hole die Standard-Tenant ID
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  -- Für jeden Tenant Standard-Kategorien erstellen
  FOR tenant_record IN SELECT id, slug FROM tenants WHERE is_active = true LOOP
    -- Standard-Kategorien einfügen
    INSERT INTO categories (code, name, description, lesson_duration_minutes, is_active, tenant_id)
    VALUES 
      ('B', 'Auto (Kat. B)', 'Führerschein für Personenwagen', 45, true, tenant_record.id),
      ('A', 'Motorrad (Kat. A)', 'Führerschein für Motorräder', 45, true, tenant_record.id),
      ('BE', 'Anhänger (Kat. BE)', 'Führerschein für Anhänger', 45, true, tenant_record.id),
      ('C', 'LKW (Kat. C)', 'Führerschein für Lastwagen', 60, true, tenant_record.id)
    ON CONFLICT (code, tenant_id) DO NOTHING;
  END LOOP;
  
  -- Bestehende Kategorien ohne tenant_id dem default tenant zuweisen
  UPDATE categories 
  SET tenant_id = default_tenant_id 
  WHERE tenant_id IS NULL;
END $$;

-- 2. Availability Settings Tabelle (globale Einstellungen)
CREATE TABLE IF NOT EXISTS availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes für bessere Performance (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_active ON staff_working_hours(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff_day ON staff_working_hours(staff_id, day_of_week);

-- 4. RLS Policies für availability_settings
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability settings" ON availability_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 5. Standard-Verfügbarkeits-Einstellungen
INSERT INTO availability_settings (setting_key, setting_value, description) VALUES
('default_buffer_minutes', '15', 'Standard-Pufferzeit in Minuten vor/nach Terminen'),
('slot_interval_minutes', '15', 'Intervall für verfügbare Zeitslots in Minuten'),
('max_advance_booking_days', '30', 'Maximale Vorausbuchung in Tagen'),
('min_advance_booking_hours', '2', 'Minimale Vorausbuchung in Stunden'),
('default_working_start', '08:00', 'Standard-Arbeitsbeginn'),
('default_working_end', '18:00', 'Standard-Arbeitsende')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Trigger für updated_at (falls nicht vorhanden)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_availability_settings_updated_at
  BEFORE UPDATE ON availability_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Nützliche Views
CREATE OR REPLACE VIEW staff_capabilities AS
SELECT 
  u.id as staff_id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.is_active as staff_active,
  u.category as primary_category, -- Aus users.category
  u.preferred_location_id, -- Aus users.preferred_location_id
  u.preferred_duration, -- Aus users.preferred_duration
  u.assigned_staff_ids, -- Aus users.assigned_staff_ids
  -- Kategorien (primär aus users.category)
  CASE 
    WHEN u.category IS NOT NULL THEN ARRAY[u.category]
    ELSE ARRAY[]::VARCHAR[]
  END as categories,
  -- Standorte (primär aus users.preferred_location_id)
  CASE 
    WHEN u.preferred_location_id IS NOT NULL THEN ARRAY[u.preferred_location_id]
    ELSE ARRAY[]::UUID[]
  END as location_ids,
  -- Standort-Namen
  CASE 
    WHEN u.preferred_location_id IS NOT NULL THEN 
      ARRAY[(SELECT name FROM locations WHERE id = u.preferred_location_id)]
    ELSE ARRAY[]::TEXT[]
  END as location_names,
  -- Arbeitszeiten (1=Montag, 7=Sonntag)
  array_agg(DISTINCT swh.day_of_week ORDER BY swh.day_of_week) as working_days,
  min(swh.start_time) as earliest_start,
  max(swh.end_time) as latest_end
FROM users u
LEFT JOIN staff_working_hours swh ON u.id = swh.staff_id AND swh.is_active = true
WHERE u.role = 'staff' AND u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, 
         u.category, u.preferred_location_id, u.preferred_duration, u.assigned_staff_ids;

-- Erweiterte View für Client-Staff-Zuordnungen
CREATE OR REPLACE VIEW client_staff_assignments AS
SELECT 
  c.id as client_id,
  c.first_name || ' ' || c.last_name as client_name,
  c.email as client_email,
  c.category as client_category,
  c.preferred_location_id as client_preferred_location,
  c.preferred_duration as client_preferred_duration,
  c.assigned_staff_id as primary_staff_id,
  c.assigned_staff_ids as additional_staff_ids,
  -- Primary Staff Info
  s1.id as primary_staff_user_id,
  s1.first_name || ' ' || s1.last_name as primary_staff_name,
  s1.category as primary_staff_category,
  s1.preferred_location_id as primary_staff_location,
  -- Additional Staff Info (falls assigned_staff_ids verwendet wird)
  array_agg(DISTINCT s2.first_name || ' ' || s2.last_name) FILTER (WHERE s2.id IS NOT NULL) as additional_staff_names
FROM users c
LEFT JOIN users s1 ON c.assigned_staff_id = s1.id AND s1.role = 'staff' AND s1.is_active = true
LEFT JOIN users s2 ON s2.id = ANY(c.assigned_staff_ids) AND s2.role = 'staff' AND s2.is_active = true
WHERE c.role = 'client' AND c.is_active = true
GROUP BY c.id, c.first_name, c.last_name, c.email, c.category, c.preferred_location_id, 
         c.preferred_duration, c.assigned_staff_id, c.assigned_staff_ids,
         s1.id, s1.first_name, s1.last_name, s1.category, s1.preferred_location_id;

-- 8. Funktion für Verfügbarkeits-Prüfung
CREATE OR REPLACE FUNCTION check_availability(
  p_staff_id UUID,
  p_location_id UUID,
  p_category_code VARCHAR(10),
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER,
  p_buffer_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_working_hours RECORD;
  v_conflicting_appointments INTEGER;
  v_buffer_start TIMESTAMP WITH TIME ZONE;
  v_buffer_end TIMESTAMP WITH TIME ZONE;
  v_staff_category TEXT;
BEGIN
  -- Prüfe ob Staff die Kategorie unterrichten kann (aus users.category)
  SELECT category INTO v_staff_category FROM users WHERE id = p_staff_id;
  
  IF v_staff_category IS NOT NULL AND v_staff_category != p_category_code THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe ob Staff am Standort unterrichten kann (aus users.preferred_location_id)
  -- UND ob der Standort zur Kategorie passt
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN locations l ON l.id = p_location_id
    WHERE u.id = p_staff_id 
    AND (u.preferred_location_id = p_location_id OR u.preferred_location_id IS NULL)
    AND (l.category IS NULL OR p_category_code = ANY(l.category) OR u.category = ANY(l.category))
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe Arbeitszeiten (1=Montag, 7=Sonntag)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM p_start_time) = 0 THEN 7  -- Sonntag = 7
    ELSE EXTRACT(DOW FROM p_start_time)             -- Montag-Samstag = 1-6
  END;
  
  SELECT * INTO v_working_hours
  FROM staff_working_hours
  WHERE staff_id = p_staff_id 
  AND day_of_week = v_day_of_week 
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe ob Termin innerhalb der Arbeitszeit liegt
  IF p_start_time::TIME < v_working_hours.start_time 
  OR (p_start_time + INTERVAL '1 minute' * p_duration_minutes)::TIME > v_working_hours.end_time THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe Konflikte mit bestehenden Terminen (mit Puffer)
  v_buffer_start := p_start_time - INTERVAL '1 minute' * p_buffer_minutes;
  v_buffer_end := p_start_time + INTERVAL '1 minute' * (p_duration_minutes + p_buffer_minutes);
  
  SELECT COUNT(*) INTO v_conflicting_appointments
  FROM appointments
  WHERE staff_id = p_staff_id
  AND location_id = p_location_id
  AND status IN ('confirmed', 'pending', 'completed', 'scheduled', 'booked')
  AND deleted_at IS NULL
  AND (
    (start_time < v_buffer_end AND end_time > v_buffer_start)
  );
  
  RETURN v_conflicting_appointments = 0;
END;
$$ LANGUAGE plpgsql;

-- 9. Kommentare für Dokumentation
COMMENT ON TABLE availability_settings IS 'Globale Einstellungen für das Verfügbarkeits-System';
COMMENT ON FUNCTION check_availability IS 'Prüft ob ein Termin an einem bestimmten Zeitpunkt verfügbar ist';
COMMENT ON VIEW staff_capabilities IS 'Übersicht aller Staff-Fähigkeiten und Verfügbarkeiten';

-- 10. Erfolgs-Meldung
DO $$
BEGIN
  RAISE NOTICE '✅ Verfügbarkeits-System minimal setup erfolgreich!';
  RAISE NOTICE '📊 Neue Tabelle: availability_settings';
  RAISE NOTICE '📈 Indexes erstellt für bessere Performance';
  RAISE NOTICE '🎯 Standard-Einstellungen eingefügt';
  RAISE NOTICE '📋 Views und Funktionen erstellt';
  RAISE NOTICE '🔄 Nutzt bestehende Tabellen: users, staff_working_hours, appointments, locations';
  RAISE NOTICE '👥 Staff-Kategorien: users.category';
  RAISE NOTICE '📍 Staff-Standorte: users.preferred_location_id';
  RAISE NOTICE '⏰ Arbeitszeiten: staff_working_hours (1=Montag, 7=Sonntag)';
END $$;
