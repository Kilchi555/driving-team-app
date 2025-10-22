-- Resource Types System für Kurse
-- Erstellt vordefinierte Ressourcenarten und allgemeine Ressourcen

-- 1. Resource Types Tabelle (vordefinierte Arten)
CREATE TABLE IF NOT EXISTS resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,                    -- "Räume", "Fahrzeuge", "Materialien"
  description TEXT,                              -- Beschreibung der Ressourcenart
  icon VARCHAR(10) DEFAULT '📦',               -- Emoji-Icon
  color VARCHAR(7) DEFAULT '#3B82F6',          -- Hex-Farbe
  is_active BOOLEAN DEFAULT true,               -- Aktiviert/deaktiviert
  is_system BOOLEAN DEFAULT false,              -- System-vordefiniert (kann nicht gelöscht werden)
  display_order INTEGER DEFAULT 0,             -- Reihenfolge der Anzeige
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Eindeutige Kombination aus tenant_id und name
  UNIQUE(tenant_id, name)
);

-- 2. General Resources Tabelle (allgemeine Ressourcen)
CREATE TABLE IF NOT EXISTS general_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type_id UUID REFERENCES resource_types(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,                   -- "Laptop", "Projektor", "Lehrbuch"
  description TEXT,                             -- Beschreibung der Ressource
  location VARCHAR(255),                        -- Standort
  status VARCHAR(20) DEFAULT 'available'       -- available, in_use, maintenance, unavailable
    CHECK (status IN ('available', 'in_use', 'maintenance', 'unavailable')),
  metadata JSONB DEFAULT '{}',                 -- Zusätzliche Eigenschaften
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_resource_types_tenant_id ON resource_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_types_active ON resource_types(is_active);
CREATE INDEX IF NOT EXISTS idx_general_resources_tenant_id ON general_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_general_resources_type_id ON general_resources(resource_type_id);
CREATE INDEX IF NOT EXISTS idx_general_resources_status ON general_resources(status);

-- 4. Default Resource Types für alle Tenants (System-vordefiniert)
INSERT INTO resource_types (tenant_id, name, description, icon, color, is_system, display_order)
SELECT 
  t.id as tenant_id,
  'Räume' as name,
  'Räumlichkeiten für Kurse und Veranstaltungen' as description,
  '🏢' as icon,
  '#3B82F6' as color,
  true as is_system,
  1 as display_order
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM resource_types rt 
  WHERE rt.tenant_id = t.id AND rt.name = 'Räume'
);

INSERT INTO resource_types (tenant_id, name, description, icon, color, is_system, display_order)
SELECT 
  t.id as tenant_id,
  'Fahrzeuge' as name,
  'Fahrzeuge für praktische Ausbildung' as description,
  '🚗' as icon,
  '#10B981' as color,
  true as is_system,
  2 as display_order
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM resource_types rt 
  WHERE rt.tenant_id = t.id AND rt.name = 'Fahrzeuge'
);

INSERT INTO resource_types (tenant_id, name, description, icon, color, is_system, display_order)
SELECT 
  t.id as tenant_id,
  'Materialien' as name,
  'Lehrmaterialien und Ausrüstung' as description,
  '📦' as icon,
  '#F59E0B' as color,
  true as is_system,
  3 as display_order
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM resource_types rt 
  WHERE rt.tenant_id = t.id AND rt.name = 'Materialien'
);

-- 5. RLS Policies
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_resources ENABLE ROW LEVEL SECURITY;

-- Resource Types RLS
CREATE POLICY "Users can view resource types for their tenant" ON resource_types
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage resource types for their tenant" ON resource_types
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- General Resources RLS
CREATE POLICY "Users can view general resources for their tenant" ON general_resources
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage general resources for their tenant" ON general_resources
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- 6. Update Trigger
CREATE OR REPLACE FUNCTION update_resource_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_types_updated_at
  BEFORE UPDATE ON resource_types
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_types_updated_at();

-- 7. Kommentare
COMMENT ON TABLE resource_types IS 'Vordefinierte Ressourcenarten für Kursressourcen';
COMMENT ON TABLE general_resources IS 'Allgemeine Ressourcen für Kurse';
COMMENT ON COLUMN resource_types.is_system IS 'System-vordefinierte Arten können nicht gelöscht werden';
COMMENT ON COLUMN general_resources.metadata IS 'Zusätzliche Eigenschaften als JSON (z.B. Seriennummer, Hersteller)';













