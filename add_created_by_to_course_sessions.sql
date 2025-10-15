-- Add created_by column to course_sessions table
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Update existing records with a default admin user (if any exists)
UPDATE course_sessions 
SET created_by = (
  SELECT id FROM users 
  WHERE role = 'admin' AND is_active = true 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Add RLS policy for course_sessions with created_by
DROP POLICY IF EXISTS "Allow authenticated users to view course_sessions" ON course_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to insert course_sessions" ON course_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to update course_sessions" ON course_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to delete course_sessions" ON course_sessions;

-- View policy
CREATE POLICY "Allow authenticated users to view course_sessions" ON course_sessions
FOR SELECT
TO authenticated
USING (tenant_id = (
  SELECT tenant_id FROM users 
  WHERE auth_user_id = auth.uid()
));

-- Insert policy
CREATE POLICY "Allow authenticated users to insert course_sessions" ON course_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  ) AND
  created_by = (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Update policy
CREATE POLICY "Allow authenticated users to update course_sessions" ON course_sessions
FOR UPDATE
TO authenticated
USING (
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);

-- Delete policy
CREATE POLICY "Allow authenticated users to delete course_sessions" ON course_sessions
FOR DELETE
TO authenticated
USING (
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid()
  )
);
