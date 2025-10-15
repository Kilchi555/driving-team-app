-- Erstelle Tabelle für Buchungen von allgemeinen Ressourcen
-- Diese Tabelle verwaltet die Buchungen und Reservierungen der general_resources

CREATE TABLE IF NOT EXISTS general_resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Buchungsdetails
  general_resource_id UUID REFERENCES general_resources(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Optional: kann auch direkt gebucht werden
  
  -- Zeitraum
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Buchungsstatus
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  
  -- Buchungsdetails
  booked_by UUID REFERENCES users(id), -- Wer hat gebucht
  notes TEXT, -- Zusätzliche Notizen zur Buchung
  
  -- Metadaten
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_end_after_start CHECK (end_time > start_time)
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_tenant_id ON general_resource_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_resource_id ON general_resource_bookings(general_resource_id);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_course_id ON general_resource_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_start_time ON general_resource_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_end_time ON general_resource_bookings(end_time);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_status ON general_resource_bookings(status);
CREATE INDEX IF NOT EXISTS idx_general_resource_bookings_time_range ON general_resource_bookings(start_time, end_time);

-- RLS Policies
ALTER TABLE general_resource_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see bookings from their tenant
CREATE POLICY "Users can view general_resource_bookings from their tenant" ON general_resource_bookings
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert bookings for their tenant
CREATE POLICY "Users can insert general_resource_bookings for their tenant" ON general_resource_bookings
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update bookings from their tenant
CREATE POLICY "Users can update general_resource_bookings from their tenant" ON general_resource_bookings
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete bookings from their tenant
CREATE POLICY "Users can delete general_resource_bookings from their tenant" ON general_resource_bookings
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_general_resource_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_general_resource_bookings_updated_at
  BEFORE UPDATE ON general_resource_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_general_resource_bookings_updated_at();

-- Funktion zur Überprüfung von Buchungskonflikten
CREATE OR REPLACE FUNCTION check_general_resource_booking_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Prüfe auf Überschneidungen mit anderen aktiven Buchungen derselben Ressource
  IF EXISTS (
    SELECT 1 FROM general_resource_bookings 
    WHERE general_resource_id = NEW.general_resource_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'active'
      AND (
        (start_time < NEW.end_time AND end_time > NEW.start_time)
      )
  ) THEN
    RAISE EXCEPTION 'Buchungskonflikt: Die Ressource ist bereits in diesem Zeitraum gebucht';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Konfliktprüfung
CREATE TRIGGER trigger_check_general_resource_booking_conflicts
  BEFORE INSERT OR UPDATE ON general_resource_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_general_resource_booking_conflicts();
