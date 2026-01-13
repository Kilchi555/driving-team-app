-- Fix RLS policies for evaluation tables
-- Issue: Policy uses auth.role() which is always 'authenticated', not the actual user role
-- Solution: Check the user's role from the users table

-- Drop existing policies
DROP POLICY IF EXISTS "Evaluation categories are viewable by everyone" ON evaluation_categories;
DROP POLICY IF EXISTS "Evaluation criteria are viewable by everyone" ON evaluation_criteria;
DROP POLICY IF EXISTS "Evaluation scale is viewable by everyone" ON evaluation_scale;
DROP POLICY IF EXISTS "Evaluation categories are manageable by admins" ON evaluation_categories;
DROP POLICY IF EXISTS "Evaluation criteria are manageable by admins" ON evaluation_criteria;
DROP POLICY IF EXISTS "Evaluation scale is manageable by admins" ON evaluation_scale;

-- Enable RLS
ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scale ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can read evaluation data (for ratings/viewing)
CREATE POLICY "evaluation_categories_select" ON evaluation_categories
FOR SELECT USING (true);

CREATE POLICY "evaluation_criteria_select" ON evaluation_criteria
FOR SELECT USING (true);

CREATE POLICY "evaluation_scale_select" ON evaluation_scale
FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Only admin/tenant_admin can manage evaluation categories
CREATE POLICY "evaluation_categories_manage" ON evaluation_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin')
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin')
    AND users.is_active = true
  )
);

-- INSERT/UPDATE/DELETE: Only admin/tenant_admin can manage evaluation criteria
CREATE POLICY "evaluation_criteria_manage" ON evaluation_criteria
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin')
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'tenant_admin')
    AND users.is_active = true
  )
);

-- INSERT/UPDATE/DELETE: Only admin can manage evaluation scale
CREATE POLICY "evaluation_scale_manage" ON evaluation_scale
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = true
  )
);

