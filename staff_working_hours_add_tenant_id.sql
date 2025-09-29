-- Add tenant_id to staff_working_hours table for multi-tenant support

-- 1. Add tenant_id column
ALTER TABLE staff_working_hours 
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Backfill tenant_id from users table
UPDATE staff_working_hours 
SET tenant_id = u.tenant_id
FROM users u 
WHERE staff_working_hours.staff_id = u.id;

-- 3. Make tenant_id NOT NULL after backfill
ALTER TABLE staff_working_hours 
ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Drop old unique constraint
ALTER TABLE staff_working_hours 
DROP CONSTRAINT staff_working_hours_staff_id_day_of_week_key;

-- 5. Add new tenant-aware unique constraint
ALTER TABLE staff_working_hours 
ADD CONSTRAINT staff_working_hours_tenant_staff_day_key 
UNIQUE (tenant_id, staff_id, day_of_week);

-- 6. Add index for tenant queries
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_tenant 
ON staff_working_hours(tenant_id);

-- 7. Enable RLS
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policy for tenant isolation
CREATE POLICY staff_working_hours_tenant_isolation ON staff_working_hours
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- 9. Update existing indexes to include tenant_id for better performance
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_tenant_staff_day 
ON staff_working_hours(tenant_id, staff_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_staff_working_hours_tenant_staff 
ON staff_working_hours(tenant_id, staff_id);

-- 10. Add comment
COMMENT ON COLUMN staff_working_hours.tenant_id IS 'Tenant isolation for multi-tenant support';
