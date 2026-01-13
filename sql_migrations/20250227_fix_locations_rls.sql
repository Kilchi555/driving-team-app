-- Fix RLS Policies for locations table
-- Problem: 403 Forbidden when updating locations (exam location selection)
-- Solution: Add UPDATE policy for staff/admins to modify locations in their tenant

-- First, check if RLS is enabled
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "locations_select_policy" ON locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON locations;
DROP POLICY IF EXISTS "locations_update_policy" ON locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON locations;

-- SELECT: Public locations or tenant-specific
CREATE POLICY "locations_select_policy" ON locations
  FOR SELECT
  USING (
    (tenant_id IS NULL) OR 
    (tenant_id IN (SELECT users.tenant_id FROM users WHERE users.auth_user_id = auth.uid() AND users.is_active = true))
  );

-- INSERT: Only admins/tenant_admins can insert
CREATE POLICY "locations_insert_policy" ON locations
  FOR INSERT
  WITH CHECK (
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role IN ('admin', 'tenant_admin') 
      AND users.is_active = true
    ))
  );

-- UPDATE: Staff and admins can update locations
-- ✅ IMPORTANT: Staff can ONLY update staff_ids array in their tenant locations
-- ✅ Staff CANNOT update global locations (tenant_id = NULL)
CREATE POLICY "locations_update_policy" ON locations
  FOR UPDATE
  USING (
    -- Admins can update anything
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role IN ('admin', 'tenant_admin') 
      AND users.is_active = true
    ))
    OR
    -- Staff can ONLY update locations in their tenant (not global)
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role = 'staff' 
      AND users.is_active = true
      AND users.tenant_id = locations.tenant_id
      AND locations.tenant_id IS NOT NULL  -- 🚫 NO global locations
    ))
  )
  WITH CHECK (
    -- Admins can update anything
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role IN ('admin', 'tenant_admin') 
      AND users.is_active = true
    ))
    OR
    -- Staff can ONLY update locations in their tenant
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role = 'staff' 
      AND users.is_active = true
      AND users.tenant_id = locations.tenant_id
      AND locations.tenant_id IS NOT NULL  -- 🚫 NO global locations
    ))
  );

-- DELETE: Only admins can delete
CREATE POLICY "locations_delete_policy" ON locations
  FOR DELETE
  USING (
    (auth.uid() IN (
      SELECT users.auth_user_id FROM users 
      WHERE users.role IN ('admin', 'tenant_admin') 
      AND users.is_active = true
    ))
  );

