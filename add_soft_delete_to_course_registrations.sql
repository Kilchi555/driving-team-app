-- Add soft delete columns to course_registrations table
-- This allows us to track when and by whom participants were removed

-- Add soft delete columns
ALTER TABLE course_registrations 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Add index for better performance on soft delete queries
CREATE INDEX idx_course_registrations_deleted_at ON course_registrations(deleted_at);
CREATE INDEX idx_course_registrations_course_id_active ON course_registrations(course_id) WHERE deleted_at IS NULL;

-- Update RLS policies to handle soft delete
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view their own course registrations" ON course_registrations;
DROP POLICY IF EXISTS "Admins can manage all course registrations" ON course_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to insert course registrations" ON course_registrations;

-- Create new policies that respect soft delete
CREATE POLICY "Users can view their own active course registrations" ON course_registrations
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  (deleted_at IS NULL) AND
  (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = course_registrations.user_id 
      AND auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all course registrations" ON course_registrations
FOR ALL USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
    AND tenant_id = course_registrations.tenant_id
  )
);

CREATE POLICY "Allow authenticated users to insert course registrations" ON course_registrations
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  deleted_at IS NULL
);

-- Add comment to document the soft delete system
COMMENT ON COLUMN course_registrations.deleted_at IS 'Timestamp when the registration was soft deleted. NULL means active.';
COMMENT ON COLUMN course_registrations.deleted_by IS 'User ID who deleted this registration. NULL if deleted by system.';
