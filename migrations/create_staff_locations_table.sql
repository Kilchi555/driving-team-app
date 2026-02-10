-- Create staff_locations junction table
-- Links staff to locations with per-staff, per-location settings

CREATE TABLE IF NOT EXISTS staff_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  location_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  is_online_bookable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_staff_locations_staff FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_locations_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_locations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Unique constraint: one entry per staff/location/tenant
  CONSTRAINT unique_staff_location UNIQUE(staff_id, location_id, tenant_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_tenant_id ON staff_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_online_bookable 
  ON staff_locations(staff_id, location_id, is_online_bookable) 
  WHERE is_online_bookable = true AND is_active = true;

-- RLS Policies
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;

-- Staff can view their own location settings
CREATE POLICY staff_locations_select_own ON staff_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Admins can view all staff locations in their tenant
CREATE POLICY staff_locations_select_admin ON staff_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.tenant_id = staff_locations.tenant_id
      AND u.auth_user_id = auth.uid()
      AND u.admin_level IS NOT NULL
    )
  );

-- Staff can update their own location settings
CREATE POLICY staff_locations_update_own ON staff_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Staff can insert their own location settings
CREATE POLICY staff_locations_insert_own ON staff_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = staff_locations.staff_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_staff_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_locations_updated_at ON staff_locations;
CREATE TRIGGER trigger_staff_locations_updated_at
  BEFORE UPDATE ON staff_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_locations_updated_at();
