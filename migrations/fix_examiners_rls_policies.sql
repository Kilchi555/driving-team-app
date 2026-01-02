-- Migration: Fix RLS policies for examiners table
-- Description: Add RLS policies to allow staff and admins to manage examiners

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS "public"."examiners" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view examiners for their tenant" ON "public"."examiners";
DROP POLICY IF EXISTS "Staff can create examiners" ON "public"."examiners";
DROP POLICY IF EXISTS "Admins can manage examiners" ON "public"."examiners";
DROP POLICY IF EXISTS "Service role has full access" ON "public"."examiners";

-- RLS Policy 1: Staff and Admins can view examiners for their tenant
CREATE POLICY "Users can view examiners for their tenant"
  ON "public"."examiners"
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
    )
  );

-- RLS Policy 2: Staff and Admins can create examiners
CREATE POLICY "Staff can create examiners"
  ON "public"."examiners"
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
    )
  );

-- RLS Policy 3: Staff and Admins can update examiners
CREATE POLICY "Staff can update examiners"
  ON "public"."examiners"
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
    )
  );

-- RLS Policy 4: Admins and Tenant Admins can delete examiners
CREATE POLICY "Admins can delete examiners"
  ON "public"."examiners"
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
    )
  );

-- RLS Policy 5: Service role has full access
CREATE POLICY "Service role has full access to examiners"
  ON "public"."examiners"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE "public"."examiners" IS 'Stores examiner information for driving exams';

