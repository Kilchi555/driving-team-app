/**
 * Migration: Fix Course Registrations Constraints
 * 
 * Problem: Multiple issues with duplicate enrollments:
 * 1. No unique constraint on (course_id, email, sari_faberid) → allows duplicates
 * 2. No payment_id tracking → webhook retries cause duplicate updates
 * 3. Orphaned pending enrollments → users blocked from re-enrolling
 * 4. Race conditions → multiple simultaneous enrollments create conflicts
 * 
 * Solution:
 * 1. Add UNIQUE constraints to prevent duplicates
 * 2. Add payment_id to link registration to payment (idempotency)
 * 3. Add expires_at for automatic cleanup of pending enrollments
 * 4. Update indexes for performance
 */

-- Step 1: Add new columns to course_registrations
ALTER TABLE course_registrations
ADD COLUMN IF NOT EXISTS payment_id UUID,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create index on payment_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_course_registrations_payment_id 
ON course_registrations(payment_id);

-- Step 3: Drop old constraints if they exist (to re-create them properly)
ALTER TABLE course_registrations 
DROP CONSTRAINT IF EXISTS course_registrations_course_id_email_key;

ALTER TABLE course_registrations 
DROP CONSTRAINT IF EXISTS course_registrations_course_id_sari_faberid_key;

-- Step 4: Add improved unique constraints
-- Only active/confirmed registrations can be unique per email
ALTER TABLE course_registrations
ADD CONSTRAINT course_registrations_unique_email 
UNIQUE (course_id, email) 
WHERE status IN ('confirmed', 'pending', 'enrolled');

-- Only active/confirmed registrations can be unique per faberid
ALTER TABLE course_registrations
ADD CONSTRAINT course_registrations_unique_faberid 
UNIQUE (course_id, sari_faberid) 
WHERE status IN ('confirmed', 'pending', 'enrolled');

-- Make payment_id unique when it exists (prevents duplicate webhook processing)
ALTER TABLE course_registrations
ADD CONSTRAINT course_registrations_unique_payment_id 
UNIQUE (payment_id) 
WHERE payment_id IS NOT NULL;

-- Step 5: Create index on (course_id, status) for common queries
CREATE INDEX IF NOT EXISTS idx_course_registrations_course_status 
ON course_registrations(course_id, status);

-- Step 6: Create index on expires_at for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_course_registrations_expires_at 
ON course_registrations(expires_at) 
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Step 7: Add foreign key constraint for payment_id (if payments table exists)
ALTER TABLE course_registrations
ADD CONSTRAINT course_registrations_payment_id_fkey 
FOREIGN KEY (payment_id) 
REFERENCES payments(id) 
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Step 8: Add comment explaining the constraints
COMMENT ON TABLE course_registrations IS 
'Course enrollments with strict constraints to prevent duplicates and orphaned data. 
Key changes: payment_id tracks webhook idempotency, expires_at allows cleanup of abandoned carts, 
unique constraints only apply to active statuses to allow re-enrollment after cancellation.';

-- Step 9: Log migration completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed: Course registrations constraints fixed at %', NOW();
END $$;
