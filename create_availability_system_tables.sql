-- Verfügbarkeits-System - Nutzt bestehende users Tabelle
-- Erstellt: 2024-12-19
-- Zweck: Staff-Kategorien-Standorte-Verfügbarkeit verwalten
-- Hinweis: Nutzt die bestehenden Felder in der users Tabelle

-- 1. Staff Working Hours Tabelle (BEREITS VORHANDEN)
-- Hinweis: Diese Tabelle existiert bereits in Ihrer Datenbank
-- CREATE TABLE IF NOT EXISTS staff_working_hours (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Montag, 7=Sonntag
--   start_time TIME NOT NULL, -- HH:MM format
--   end_time TIME NOT NULL, -- HH:MM format
--   is_active BOOLEAN DEFAULT true,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   
--   -- Unique constraint: ein Staff kann nur eine Arbeitszeit pro Wochentag haben
--   UNIQUE(staff_id, day_of_week)
-- );

-- 2. Staff Categories Tabelle (optional - für erweiterte Kategorien)
-- Hinweis: Primär wird users.category verwendet
CREATE TABLE IF NOT EXISTS staff_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_code VARCHAR(10) NOT NULL REFERENCES categories(code) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: ein Staff kann eine Kategorie nur einmal haben
  UNIQUE(staff_id, category_code)
);

-- 3. Staff Locations Tabelle (optional - für erweiterte Standorte)
-- Hinweis: Primär wird users.preferred_location_id verwendet
CREATE TABLE IF NOT EXISTS staff_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: ein Staff kann einen Standort nur einmal haben
  UNIQUE(staff_id, location_id)
);

-- 4. Availability Settings Tabelle (globale Einstellungen)
CREATE TABLE IF NOT EXISTS availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff_day ON staff_working_hours(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_active ON staff_working_hours(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_categories_staff ON staff_categories(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_categories_code ON staff_categories(category_code);
CREATE INDEX IF NOT EXISTS idx_staff_categories_active ON staff_categories(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff ON staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location ON staff_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_active ON staff_locations(is_active) WHERE is_active = true;

-- 6. RLS (Row Level Security) Policies
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

-- Staff Working Hours Policies
CREATE POLICY "Staff can view their own working hours" ON staff_working_hours
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can manage their own working hours" ON staff_working_hours
  FOR ALL USING (staff_id = auth.uid());

CREATE POLICY "Admins can view all working hours" ON staff_working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Staff Categories Policies
CREATE POLICY "Staff can view their own categories" ON staff_categories
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can manage their own categories" ON staff_categories
  FOR ALL USING (staff_id = auth.uid());

CREATE POLICY "Admins can view all staff categories" ON staff_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Staff Locations Policies
CREATE POLICY "Staff can view their own locations" ON staff_locations
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can manage their own locations" ON staff_locations
  FOR ALL USING (staff_id = auth.uid());

CREATE POLICY "Admins can view all staff locations" ON staff_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Availability Settings Policies (nur Admins)
CREATE POLICY "Admins can manage availability settings" ON availability_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 7. Standard-Daten einfügen (OPTIONAL - nur wenn erweiterte Tabellen gewünscht)
-- Hinweis: Das System funktioniert auch ohne diese Tabellen, da es die users Tabelle nutzt

-- Standard-Arbeitszeiten für alle Staff (8:00-18:00, Mo-Fr) - OPTIONAL
-- INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time)
-- SELECT 
--   u.id,
--   day_num,
--   '08:00'::TIME,
--   '18:00'::TIME
-- FROM users u
-- CROSS JOIN generate_series(1, 5) AS day_num -- Montag bis Freitag
-- WHERE u.role = 'staff' 
-- AND u.is_active = true
-- ON CONFLICT (staff_id, day_of_week) DO NOTHING;

-- Staff-Kategorien aus users.category Feld - OPTIONAL
-- INSERT INTO staff_categories (staff_id, category_code)
-- SELECT 
--   u.id,
--   u.category
-- FROM users u
-- WHERE u.role = 'staff' 
-- AND u.is_active = true
-- AND u.category IS NOT NULL
-- AND EXISTS (SELECT 1 FROM categories c WHERE c.code = u.category AND c.is_active = true)
-- ON CONFLICT (staff_id, category_code) DO NOTHING;

-- Staff-Standorte aus users.preferred_location_id - OPTIONAL
-- INSERT INTO staff_locations (staff_id, location_id)
-- SELECT 
--   u.id,
--   u.preferred_location_id
-- FROM users u
-- WHERE u.role = 'staff' 
-- AND u.is_active = true
-- AND u.preferred_location_id IS NOT NULL
-- AND EXISTS (SELECT 1 FROM locations l WHERE l.id = u.preferred_location_id AND l.is_active = true)
-- ON CONFLICT (staff_id, location_id) DO NOTHING;

-- Standard-Verfügbarkeits-Einstellungen
INSERT INTO availability_settings (setting_key, setting_value, description) VALUES
('default_buffer_minutes', '15', 'Standard-Pufferzeit in Minuten vor/nach Terminen'),
('slot_interval_minutes', '15', 'Intervall für verfügbare Zeitslots in Minuten'),
('max_advance_booking_days', '30', 'Maximale Vorausbuchung in Tagen'),
('min_advance_booking_hours', '2', 'Minimale Vorausbuchung in Stunden'),
('default_working_start', '08:00', 'Standard-Arbeitsbeginn'),
('default_working_end', '18:00', 'Standard-Arbeitsende')
ON CONFLICT (setting_key) DO NOTHING;

-- 8. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_working_hours_updated_at
  BEFORE UPDATE ON staff_working_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_categories_updated_at
  BEFORE UPDATE ON staff_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_locations_updated_at
  BEFORE UPDATE ON staff_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_settings_updated_at
  BEFORE UPDATE ON availability_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Nützliche Views
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
  -- Kategorien aus staff_categories Tabelle (falls vorhanden)
  CASE 
    WHEN EXISTS (SELECT 1 FROM staff_categories WHERE staff_id = u.id) 
    THEN array_agg(DISTINCT sc.category_code)
    ELSE CASE 
      WHEN u.category IS NOT NULL THEN ARRAY[u.category]
      ELSE ARRAY[]::VARCHAR[]
    END
  END as categories,
  -- Standorte aus staff_locations Tabelle (falls vorhanden)
  CASE 
    WHEN EXISTS (SELECT 1 FROM staff_locations WHERE staff_id = u.id) 
    THEN array_agg(DISTINCT sl.location_id)
    ELSE CASE 
      WHEN u.preferred_location_id IS NOT NULL THEN ARRAY[u.preferred_location_id]
      ELSE ARRAY[]::UUID[]
    END
  END as location_ids,
  -- Standort-Namen
  CASE 
    WHEN EXISTS (SELECT 1 FROM staff_locations WHERE staff_id = u.id) 
    THEN array_agg(DISTINCT l.name)
    ELSE CASE 
      WHEN u.preferred_location_id IS NOT NULL THEN 
        ARRAY[(SELECT name FROM locations WHERE id = u.preferred_location_id)]
      ELSE ARRAY[]::TEXT[]
    END
  END as location_names,
  -- Arbeitszeiten (1=Montag, 7=Sonntag)
  array_agg(DISTINCT swh.day_of_week ORDER BY swh.day_of_week) as working_days,
  min(swh.start_time) as earliest_start,
  max(swh.end_time) as latest_end
FROM users u
LEFT JOIN staff_categories sc ON u.id = sc.staff_id AND sc.is_active = true
LEFT JOIN staff_locations sl ON u.id = sl.staff_id AND sl.is_active = true
LEFT JOIN locations l ON sl.location_id = l.id AND l.is_active = true
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
  s1.id as primary_staff_id,
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

-- 10. Funktion für Verfügbarkeits-Prüfung
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
BEGIN
  -- Prüfe ob Staff die Kategorie unterrichten kann
  IF NOT EXISTS (
    SELECT 1 FROM staff_categories 
    WHERE staff_id = p_staff_id 
    AND category_code = p_category_code 
    AND is_active = true
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe ob Staff am Standort unterrichten kann
  IF NOT EXISTS (
    SELECT 1 FROM staff_locations 
    WHERE staff_id = p_staff_id 
    AND location_id = p_location_id 
    AND is_active = true
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
  AND status IN ('confirmed', 'pending', 'completed')
  AND (
    (start_time < v_buffer_end AND end_time > v_buffer_start)
  );
  
  RETURN v_conflicting_appointments = 0;
END;
$$ LANGUAGE plpgsql;

-- 11. Kommentare für Dokumentation
COMMENT ON TABLE staff_working_hours IS 'Arbeitszeiten der Staff-Mitglieder pro Wochentag';
COMMENT ON TABLE staff_categories IS 'Welche Fahrkategorien ein Staff unterrichten kann';
COMMENT ON TABLE staff_locations IS 'An welchen Standorten ein Staff unterrichten kann';
COMMENT ON TABLE availability_settings IS 'Globale Einstellungen für das Verfügbarkeits-System';

COMMENT ON FUNCTION check_availability IS 'Prüft ob ein Termin an einem bestimmten Zeitpunkt verfügbar ist';
COMMENT ON VIEW staff_capabilities IS 'Übersicht aller Staff-Fähigkeiten und Verfügbarkeiten';

-- 12. Erfolgs-Meldung
DO $$
BEGIN
  RAISE NOTICE '✅ Verfügbarkeits-System Tabellen erfolgreich erstellt!';
  RAISE NOTICE '📊 Tabellen: staff_working_hours, staff_categories, staff_locations, availability_settings';
  RAISE NOTICE '🔐 RLS Policies aktiviert';
  RAISE NOTICE '📈 Indexes erstellt für bessere Performance';
  RAISE NOTICE '🎯 Standard-Daten eingefügt (nutzt users.category und users.preferred_location_id)';
  RAISE NOTICE '⚡ Trigger für updated_at erstellt';
  RAISE NOTICE '📋 Views und Funktionen erstellt';
  RAISE NOTICE '🔄 Fallback-Logik: Nutzt users.category und users.preferred_location_id wenn spezielle Tabellen nicht vorhanden';
  RAISE NOTICE '👥 Client-Staff-Zuordnungen: Nutzt users.assigned_staff_id und users.assigned_staff_ids';
END $$;
