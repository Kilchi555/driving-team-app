-- Fix RLS policies for 'pendencies' table
-- Issue: Pendencies are created but cannot be read by staff due to missing RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "pendencies_select_policy" ON pendencies;
DROP POLICY IF EXISTS "pendencies_insert_policy" ON pendencies;
DROP POLICY IF EXISTS "pendencies_update_policy" ON pendencies;
DROP POLICY IF EXISTS "pendencies_delete_policy" ON pendencies;

-- Enable RLS
ALTER TABLE pendencies ENABLE ROW LEVEL SECURITY;

-- SELECT: Staff/Admin can see pendencies assigned to them or created by them, or all pendencies for their tenant
CREATE POLICY "pendencies_select_policy" ON pendencies
FOR SELECT
USING (
  -- If assigned_to is set, only that user can see it
  (assigned_to IS NOT NULL AND assigned_to = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- If created_by is set, only that user can see it
  (created_by IS NOT NULL AND created_by = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- Admins/Staff can see all pendencies for their tenant
  (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE (
        users.auth_user_id = auth.uid()
        AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
        AND users.is_active = true
      )
    )
  )
);

-- INSERT: Only staff/admin can create pendencies for their tenant
CREATE POLICY "pendencies_insert_policy" ON pendencies
FOR INSERT
WITH CHECK (
  -- Only staff/admin can create
  (
    SELECT role FROM users 
    WHERE auth_user_id = auth.uid()
  ) IN ('admin', 'staff', 'tenant_admin')
  AND
  -- Pendency must be for their tenant
  tenant_id IN (
    SELECT users.tenant_id
    FROM users
    WHERE (
      users.auth_user_id = auth.uid()
      AND users.role = ANY(ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text])
      AND users.is_active = true
    )
  )
);

-- UPDATE: Staff/Admin can update pendencies they created or are assigned to
CREATE POLICY "pendencies_update_policy" ON pendencies
FOR UPDATE
USING (
  -- If assigned_to is set, only that user can update it
  (assigned_to IS NOT NULL AND assigned_to = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- If created_by is set, only that user can update it
  (created_by IS NOT NULL AND created_by = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- Admins for the tenant can update
  (
    (
      SELECT role FROM users 
      WHERE auth_user_id = auth.uid()
    ) = 'admin'
    AND
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE auth_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Same checks for update
  (assigned_to IS NOT NULL AND assigned_to = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  (created_by IS NOT NULL AND created_by = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  (
    (
      SELECT role FROM users 
      WHERE auth_user_id = auth.uid()
    ) = 'admin'
    AND
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- DELETE: Staff/Admin can soft-delete pendencies they created or are assigned to
CREATE POLICY "pendencies_delete_policy" ON pendencies
FOR DELETE
USING (
  -- If assigned_to is set, only that user can delete it
  (assigned_to IS NOT NULL AND assigned_to = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- If created_by is set, only that user can delete it
  (created_by IS NOT NULL AND created_by = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  ))
  OR
  -- Admins for the tenant can delete
  (
    (
      SELECT role FROM users 
      WHERE auth_user_id = auth.uid()
    ) = 'admin'
    AND
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE auth_user_id = auth.uid()
    )
  )
);

