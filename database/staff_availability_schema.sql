-- DB Schema Erweiterungen für Staff-Verfügbarkeits-Einstellungen
-- Diese Datei enthält alle notwendigen Tabellen und Spalten für das neue System

-- 1. Staff-Verfügbarkeitseinstellungen
CREATE TABLE IF NOT EXISTS staff_availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability_mode VARCHAR(20) DEFAULT 'standard' CHECK (availability_mode IN ('standard', 'pickup', 'hybrid')),
  pickup_radius_minutes INTEGER DEFAULT 10 CHECK (pickup_radius_minutes >= 5 AND pickup_radius_minutes <= 60),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id)
);

-- 1b. Staff-Kategorie-spezifische Verfügbarkeit (Pickup pro Kategorie)
CREATE TABLE IF NOT EXISTS staff_category_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  -- Nur Pickup-relevante Felder jetzt; Modus kann später ergänzt werden
  pickup_enabled BOOLEAN DEFAULT false,
  pickup_radius_minutes INTEGER DEFAULT 10 CHECK (pickup_radius_minutes >= 5 AND pickup_radius_minutes <= 60),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, category_code)
);

-- 2. Locations erweitern für Multi-Kategorien und Pickup
ALTER TABLE locations ADD COLUMN IF NOT EXISTS available_categories TEXT[] DEFAULT '{}';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS pickup_radius_minutes INTEGER DEFAULT 10;

-- 3. PLZ-Distanz-Cache für effiziente Distanzberechnungen
CREATE TABLE IF NOT EXISTS plz_distance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plz VARCHAR(10) NOT NULL,
  to_plz VARCHAR(10) NOT NULL,
  driving_time_minutes INTEGER NOT NULL CHECK (driving_time_minutes > 0),
  distance_km DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_plz, to_plz)
);

-- Ensure ON CONFLICT targets exist before using them
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tenant_settings_tenant_key ON tenant_settings(tenant_id, setting_key);

-- 4. Tenant-Settings erweitern für Pickup-Modus
INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_value) 
SELECT DISTINCT tenant_id, 'availability', 'allow_pickup_mode', 'false'
FROM users 
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_value) 
SELECT DISTINCT tenant_id, 'availability', 'allow_staff_category_settings', 'true'
FROM users 
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

INSERT INTO tenant_settings (tenant_id, category, setting_key, setting_value) 
SELECT DISTINCT tenant_id, 'availability', 'default_pickup_radius_minutes', '10'
FROM users 
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- 5. RLS Policies für neue Tabellen
-- Staff Availability Settings
CREATE POLICY staff_availability_settings_tenant_isolation ON staff_availability_settings
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM users WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM users WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- PLZ Distance Cache (öffentlich lesbar für alle Tenants)
CREATE POLICY plz_distance_cache_read ON plz_distance_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY plz_distance_cache_write ON plz_distance_cache
  FOR ALL TO authenticated
  USING (
    -- Nur Admins können Distanzen schreiben/aktualisieren
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'sub_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'sub_admin')
    )
  );

-- RLS für staff_category_availability (Tenant-Isolation über staff_id)
CREATE POLICY staff_category_availability_tenant_isolation ON staff_category_availability
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM users WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM users WHERE tenant_id = (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 6. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_staff_availability_settings_staff_id ON staff_availability_settings(staff_id);
CREATE INDEX IF NOT EXISTS idx_plz_distance_cache_from_to ON plz_distance_cache(from_plz, to_plz);
CREATE INDEX IF NOT EXISTS idx_locations_available_categories ON locations USING GIN(available_categories);
-- Ensure unique indexes exist for upserts
CREATE UNIQUE INDEX IF NOT EXISTS uniq_staff_availability_settings_staff ON staff_availability_settings(staff_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plz_distance_cache_from_to ON plz_distance_cache(from_plz, to_plz);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_staff_category_availability_staff_cat ON staff_category_availability(staff_id, category_code);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tenant_settings_tenant_key ON tenant_settings(tenant_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_staff_category_availability_staff ON staff_category_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_category_availability_cat ON staff_category_availability(category_code);

-- 7. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_availability_settings_updated_at 
  BEFORE UPDATE ON staff_availability_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plz_distance_cache_updated_at 
  BEFORE UPDATE ON plz_distance_cache 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger
CREATE TRIGGER update_staff_category_availability_updated_at 
  BEFORE UPDATE ON staff_category_availability 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Beispiel-Daten für Testing (optional)
-- INSERT INTO staff_availability_settings (staff_id, availability_mode, pickup_radius_minutes)
-- SELECT id, 'standard', 10
-- FROM users 
-- WHERE role = 'staff' 
-- AND id NOT IN (SELECT staff_id FROM staff_availability_settings);

-- 9. Kommentare für Dokumentation
COMMENT ON TABLE staff_availability_settings IS 'Verfügbarkeits-Einstellungen pro Fahrlehrer';
COMMENT ON COLUMN staff_availability_settings.availability_mode IS 'Verfügbarkeitsmodus: standard, pickup, hybrid';
COMMENT ON COLUMN staff_availability_settings.pickup_radius_minutes IS 'Pickup-Radius in Minuten Fahrzeit';

COMMENT ON TABLE plz_distance_cache IS 'Cache für PLZ-zu-PLZ Distanzen zur Performance-Optimierung';
COMMENT ON COLUMN plz_distance_cache.driving_time_minutes IS 'Fahrzeit zwischen PLZ in Minuten';

COMMENT ON COLUMN locations.available_categories IS 'Array von Kategorie-Codes für die diese Location verfügbar ist';
COMMENT ON COLUMN locations.pickup_enabled IS 'Ob Pickup an dieser Location möglich ist';
COMMENT ON COLUMN locations.pickup_radius_minutes IS 'Pickup-Radius für diese spezifische Location';
