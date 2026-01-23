-- STEP 1: Database Schema Updates for Course Registration Payment Linking
-- Created: 2025-01-23
-- Purpose: Fix critical payment linking issues

-- 1. Add course_registration_id column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS course_registration_id UUID REFERENCES course_registrations(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_course_registration_id ON payments(course_registration_id);

-- 3. Add FK constraint to course_registrations.payment_id (if not exists)
-- First check if constraint already exists
ALTER TABLE course_registrations 
ADD CONSTRAINT IF NOT EXISTS fk_course_registrations_payment_id 
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- 4. Create index on course_registrations.payment_id
CREATE INDEX IF NOT EXISTS idx_course_registrations_payment_id ON course_registrations(payment_id);

-- 5. Verify schema changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name = 'course_registration_id';

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_registrations' 
  AND column_name IN ('payment_id', 'user_id');

-- 6. Check for orphaned payments (payments without appointment_id and without course_registration_id)
SELECT 
  COUNT(*) as orphaned_payments,
  COUNT(DISTINCT user_id) as affected_users
FROM payments 
WHERE appointment_id IS NULL 
  AND course_registration_id IS NULL;

