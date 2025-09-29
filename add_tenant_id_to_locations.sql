-- Add tenant_id to locations table for multi-tenant support
-- Each tenant should have their own locations (standard and pickup)

-- 1. Add tenant_id column to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_type ON locations(tenant_id, location_type);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_staff ON locations(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_user ON locations(tenant_id, user_id);

-- 3. Update existing locations to belong to default tenant
-- (Replace with your actual default tenant ID)
UPDATE locations 
SET tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
WHERE tenant_id IS NULL;

-- 4. Make tenant_id required after data migration
ALTER TABLE locations 
ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Add RLS policy for tenant isolation
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access locations from their tenant
CREATE POLICY locations_tenant_access ON locations
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

-- 6. Copy default locations to second tenant (if exists)
INSERT INTO locations (name, address, latitude, longitude, location_type, staff_id, user_id, google_place_id, is_active, tenant_id)
SELECT 
  name,
  address,
  latitude,
  longitude,
  location_type,
  staff_id,
  user_id,
  google_place_id,
  is_active,
  '78af580f-1670-4be3-a556-250339c872fa' -- Second tenant ID
FROM locations 
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
ON CONFLICT DO NOTHING;

-- 7. Verify the migration
SELECT 
  t.name as tenant_name,
  COUNT(l.id) as locations_count,
  COUNT(CASE WHEN l.location_type = 'standard' THEN 1 END) as standard_locations,
  COUNT(CASE WHEN l.location_type = 'pickup' THEN 1 END) as pickup_locations,
  COUNT(CASE WHEN l.location_type = 'exam' THEN 1 END) as exam_locations
FROM tenants t
LEFT JOIN locations l ON t.id = l.tenant_id
GROUP BY t.id, t.name
ORDER BY t.name;

-- 8. Show sample data
SELECT 
  l.name,
  l.location_type,
  l.staff_id,
  l.user_id,
  t.name as tenant_name
FROM locations l
JOIN tenants t ON l.tenant_id = t.id
ORDER BY t.name, l.location_type, l.name
LIMIT 10;
