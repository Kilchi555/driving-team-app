-- Simple rooms table creation
-- Creates the rooms table if it doesn't exist

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Room details
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  description TEXT,
  equipment JSONB,
  
  -- Booking settings
  is_public BOOLEAN DEFAULT true,
  hourly_rate_rappen INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS rooms_select ON rooms
  FOR SELECT TO authenticated
  USING (
    is_public = true 
    OR tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY IF NOT EXISTS rooms_insert ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY IF NOT EXISTS rooms_update ON rooms
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY IF NOT EXISTS rooms_delete ON rooms
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- Insert some default rooms for existing tenants
INSERT INTO rooms (tenant_id, name, location, capacity, description, is_public, hourly_rate_rappen) VALUES
-- Tenant 1
('64259d68-195a-4c68-8875-f1b44d962830', 'Theorieraum 1', 'Zürich-Altstetten', 25, 'Hauptraum für VKU-Kurse', true, 5000),
('64259d68-195a-4c68-8875-f1b44d962830', 'Seminarraum', 'Zürich-Altstetten', 15, 'Kleinerer Raum für Weiterbildungen', true, 3000),
-- Tenant 2  
('78af580f-1670-4be3-a556-250339c872fa', 'Theorieraum A', 'Lachen', 20, 'Hauptraum für Kurse', true, 4500),
('78af580f-1670-4be3-a556-250339c872fa', 'Besprechungsraum', 'Lachen', 10, 'Für kleine Gruppen', false, 2500)
ON CONFLICT DO NOTHING;

-- Verify
DO $$
DECLARE
    room_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO room_count FROM rooms;
    RAISE NOTICE 'Rooms table created successfully';
    RAISE NOTICE 'Total rooms created: %', room_count;
    RAISE NOTICE 'Rooms are now available for course bookings';
END $$;












