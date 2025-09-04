-- Migration: Add soft delete fields to appointments table
-- Date: 2024-12-19
-- Description: Add soft delete functionality instead of hard deletion

-- Add soft delete fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at);

-- Create index for soft delete queries with user
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_by ON appointments(deleted_by);

-- Update RLS policies to exclude deleted appointments
-- (This will be done in the next step after testing)

-- Add comment to table
COMMENT ON COLUMN appointments.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN appointments.deleted_by IS 'User ID who performed the soft delete';
COMMENT ON COLUMN appointments.deletion_reason IS 'Reason for deletion (optional)';

-- Show current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;
