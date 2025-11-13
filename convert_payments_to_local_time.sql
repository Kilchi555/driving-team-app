-- Convert payments table to store times in Swiss Local Time (no timezone)
-- Created: 2025-11-12
-- Purpose: Align with rest of app (90%) that uses local time

-- ============================================
-- BACKUP CHECK: View current data
-- ============================================
SELECT 
  id,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS TZ') as created_at_utc,
  to_char(created_at AT TIME ZONE 'Europe/Zurich', 'YYYY-MM-DD HH24:MI:SS') as will_become_local,
  pg_typeof(created_at) as current_type
FROM payments
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- CONVERSION: Change columns to TIMESTAMP (local time, no timezone)
-- ============================================

-- Strategy: Convert in place using ALTER COLUMN with USING clause
-- This converts UTC to local time and changes type in one step

-- 1. created_at
ALTER TABLE payments 
ALTER COLUMN created_at TYPE TIMESTAMP 
USING (created_at AT TIME ZONE 'Europe/Zurich');

ALTER TABLE payments 
ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'Europe/Zurich');

-- 2. updated_at
ALTER TABLE payments 
ALTER COLUMN updated_at TYPE TIMESTAMP 
USING (updated_at AT TIME ZONE 'Europe/Zurich');

ALTER TABLE payments 
ALTER COLUMN updated_at SET DEFAULT (NOW() AT TIME ZONE 'Europe/Zurich');

-- 3. paid_at
ALTER TABLE payments 
ALTER COLUMN paid_at TYPE TIMESTAMP 
USING (paid_at AT TIME ZONE 'Europe/Zurich');

-- 4. refunded_at
ALTER TABLE payments 
ALTER COLUMN refunded_at TYPE TIMESTAMP 
USING (refunded_at AT TIME ZONE 'Europe/Zurich');

-- 5. scheduled_payment_date
ALTER TABLE payments 
ALTER COLUMN scheduled_payment_date TYPE TIMESTAMP 
USING (scheduled_payment_date AT TIME ZONE 'Europe/Zurich');

-- 6. scheduled_authorization_date
ALTER TABLE payments 
ALTER COLUMN scheduled_authorization_date TYPE TIMESTAMP 
USING (scheduled_authorization_date AT TIME ZONE 'Europe/Zurich');

-- 7. automatic_payment_processed_at
ALTER TABLE payments 
ALTER COLUMN automatic_payment_processed_at TYPE TIMESTAMP 
USING (automatic_payment_processed_at AT TIME ZONE 'Europe/Zurich');

-- 8. automatic_payment_consent_at
ALTER TABLE payments 
ALTER COLUMN automatic_payment_consent_at TYPE TIMESTAMP 
USING (automatic_payment_consent_at AT TIME ZONE 'Europe/Zurich');

-- 9. due_date
ALTER TABLE payments 
ALTER COLUMN due_date TYPE TIMESTAMP 
USING (due_date AT TIME ZONE 'Europe/Zurich');

-- ============================================
-- VERIFICATION: Check results
-- ============================================
SELECT 
  'AFTER CONVERSION' as status,
  column_name,
  data_type,
  datetime_precision,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'created_at', 
    'updated_at', 
    'paid_at', 
    'scheduled_payment_date',
    'scheduled_authorization_date'
  )
ORDER BY ordinal_position;

-- ============================================
-- VERIFICATION: Check actual data
-- ============================================
SELECT 
  id,
  created_at,
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_formatted,
  pg_typeof(created_at) as new_type,
  scheduled_payment_date,
  scheduled_authorization_date
FROM payments
ORDER BY created_at DESC
LIMIT 5;

