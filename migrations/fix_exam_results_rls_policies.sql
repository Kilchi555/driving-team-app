-- Migration: Fix RLS policies for exam_results table
-- Description: Add RLS policies to allow staff and admins to manage exam results

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS "public"."exam_results" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view exam results for their tenant" ON "public"."exam_results";
DROP POLICY IF EXISTS "Staff can create exam results" ON "public"."exam_results";
DROP POLICY IF EXISTS "Staff can update exam results" ON "public"."exam_results";
DROP POLICY IF EXISTS "Admins can delete exam results" ON "public"."exam_results";
DROP POLICY IF EXISTS "Service role has full access" ON "public"."exam_results";

-- RLS Policy 1: Staff and Admins can view exam results for their tenant
CREATE POLICY "Users can view exam results for their tenant"
  ON "public"."exam_results"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = exam_results.appointment_id
      AND a.tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'staff', 'tenant_admin')
      )
    )
  );

-- RLS Policy 2: Staff and Admins can create exam results
CREATE POLICY "Staff can create exam results"
  ON "public"."exam_results"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND a.tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'staff', 'tenant_admin')
      )
    )
  );

-- RLS Policy 3: Staff and Admins can update exam results
CREATE POLICY "Staff can update exam results"
  ON "public"."exam_results"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = exam_results.appointment_id
      AND a.tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'staff', 'tenant_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND a.tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'staff', 'tenant_admin')
      )
    )
  );

-- RLS Policy 4: Admins and Tenant Admins can delete exam results
CREATE POLICY "Admins can delete exam results"
  ON "public"."exam_results"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = exam_results.appointment_id
      AND a.tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'tenant_admin')
      )
    )
  );

-- RLS Policy 5: Service role has full access
CREATE POLICY "Service role has full access to exam results"
  ON "public"."exam_results"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE "public"."exam_results" IS 'Stores exam result details including ratings and feedback';




