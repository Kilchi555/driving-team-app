-- Migration: Add course_registration_id to payments table
-- This allows linking course enrollment payments to their registrations
-- Previously we only had appointment_id, but course payments have no appointment

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS course_registration_id UUID REFERENCES course_registrations(id);

COMMENT ON COLUMN payments.course_registration_id IS 'Reference to course registration for course enrollment payments (instead of appointment_id)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_course_registration_id 
ON payments(course_registration_id);

-- Note: Existing course enrollment payments already have course_registration_id in metadata
-- This column allows us to store it directly for easier access in queries

