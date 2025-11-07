-- Schema für Terminpräferenzen von Kunden
-- Diese Präferenzen werden verwendet, wenn Online-Buchung deaktiviert ist

CREATE TABLE IF NOT EXISTS appointment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL wenn noch nicht angemeldet
  email TEXT, -- Für nicht-angemeldete Kunden
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  category_code TEXT, -- Gewünschte Fahrkategorie
  preferred_days TEXT[], -- Array mit Wochentagen: ['monday', 'tuesday', etc.]
  preferred_time_start TIME, -- z.B. '08:00:00'
  preferred_time_end TIME, -- z.B. '18:00:00'
  preferred_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  preferred_location_address TEXT, -- Fallback falls keine Location-ID
  notes TEXT, -- Zusätzliche Hinweise vom Kunden
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'scheduled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional: Präferenzen verfallen nach X Tagen
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_appointment_preferences_tenant_id ON appointment_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointment_preferences_user_id ON appointment_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_preferences_email ON appointment_preferences(email);
CREATE INDEX IF NOT EXISTS idx_appointment_preferences_status ON appointment_preferences(status);
CREATE INDEX IF NOT EXISTS idx_appointment_preferences_created_at ON appointment_preferences(created_at);

-- RLS Policies
-- INSERT für alle (auch nicht-angemeldete Benutzer)
CREATE POLICY appointment_preferences_public_insert ON appointment_preferences
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- SELECT/UPDATE für authentifizierte Benutzer (ihre eigenen Präferenzen oder als Admin/Staff)
CREATE POLICY appointment_preferences_tenant_isolation ON appointment_preferences
  FOR SELECT TO authenticated
  USING (
    -- Eigene Präferenzen
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Oder Admin/Staff des gleichen Tenants
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY appointment_preferences_tenant_update ON appointment_preferences
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- Trigger für updated_at
CREATE TRIGGER update_appointment_preferences_updated_at 
  BEFORE UPDATE ON appointment_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kommentare
COMMENT ON TABLE appointment_preferences IS 'Terminpräferenzen von Kunden (wenn Online-Buchung deaktiviert)';
COMMENT ON COLUMN appointment_preferences.user_id IS 'NULL wenn Kunde noch nicht registriert ist';
COMMENT ON COLUMN appointment_preferences.preferred_days IS 'Array mit Wochentagen: monday, tuesday, wednesday, thursday, friday, saturday, sunday';
COMMENT ON COLUMN appointment_preferences.preferred_time_start IS 'Gewünschte Startzeit für Termine';
COMMENT ON COLUMN appointment_preferences.preferred_time_end IS 'Gewünschte Endzeit für Termine';
COMMENT ON COLUMN appointment_preferences.status IS 'pending: Wartet auf Kontakt, contacted: Vom Fahrlehrer kontaktiert, scheduled: Termin vereinbart, expired: Abgelaufen';

