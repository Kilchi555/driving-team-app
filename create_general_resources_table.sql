-- Erstelle Tabelle für allgemeine Ressourcen
-- Diese Tabelle kann für alle Ressourcen verwendet werden, die nicht in die Kategorien Räume oder Fahrzeuge fallen

CREATE TABLE IF NOT EXISTS general_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Grunddaten
  name VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100) NOT NULL, -- 'equipment', 'material', 'tool', 'service', etc.
  
  -- Status und Verfügbarkeit
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  location VARCHAR(255),
  
  -- Zusätzliche Eigenschaften (flexibel als JSON)
  properties JSONB DEFAULT '{}'::jsonb, -- Für spezifische Eigenschaften je nach Ressourcentyp
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_general_resources_tenant_id ON general_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_general_resources_type ON general_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_general_resources_active ON general_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_general_resources_available ON general_resources(is_available);

-- RLS Policies
ALTER TABLE general_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see resources from their tenant
CREATE POLICY "Users can view general_resources from their tenant" ON general_resources
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert resources for their tenant
CREATE POLICY "Users can insert general_resources for their tenant" ON general_resources
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update resources from their tenant
CREATE POLICY "Users can update general_resources from their tenant" ON general_resources
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete resources from their tenant
CREATE POLICY "Users can delete general_resources from their tenant" ON general_resources
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_general_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_general_resources_updated_at
  BEFORE UPDATE ON general_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_general_resources_updated_at();
