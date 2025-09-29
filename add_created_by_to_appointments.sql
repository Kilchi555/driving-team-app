-- Migration: Add created_by column to appointments table
-- This tracks who created each appointment

-- Add created_by column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);

-- For existing appointments, set created_by to staff_id as fallback
-- (assuming the staff member who owns the appointment created it)
UPDATE appointments 
SET created_by = staff_id 
WHERE created_by IS NULL AND staff_id IS NOT NULL;

-- For appointments without staff_id, set to a default admin user if available
-- (you may need to adjust this based on your actual admin user ID)
UPDATE appointments 
SET created_by = (
  SELECT id FROM users WHERE role = 'admin' LIMIT 1
)
WHERE created_by IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN appointments.created_by IS 'User who created this appointment (references users.id)';

-- Show summary of the migration
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_appointments,
  COUNT(created_by) as appointments_with_created_by,
  COUNT(*) - COUNT(created_by) as appointments_without_created_by
FROM appointments;
