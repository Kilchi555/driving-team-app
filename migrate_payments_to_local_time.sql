-- Migrate payments table timestamps from UTC to Swiss Local Time
-- Created: 2025-11-12
-- Purpose: Convert TIMESTAMP WITH TIME ZONE to TIMESTAMP (local time only)
-- Note: 90% of app already uses local time, this aligns payments table

-- ============================================
-- STEP 1: Backup check - Show current data before migration
-- ============================================
SELECT 
  'BEFORE MIGRATION' as status,
  id,
  created_at,
  created_at AT TIME ZONE 'Europe/Zurich' as created_at_will_become,
  pg_typeof(created_at) as current_type
FROM payments
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- STEP 2: Convert timestamp columns to local time (without timezone)
-- ============================================
-- Strategy: 
-- 1. Create new columns with TIMESTAMP (no timezone)
-- 2. Copy data converted to Swiss local time
-- 3. Drop old columns
-- 4. Rename new columns to original names

-- 2.1: created_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at_local TIMESTAMP;
UPDATE payments SET created_at_local = (created_at AT TIME ZONE 'Europe/Zurich');

-- 2.2: updated_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at_local TIMESTAMP;
UPDATE payments SET updated_at_local = (updated_at AT TIME ZONE 'Europe/Zurich');

-- 2.3: paid_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at_local TIMESTAMP;
UPDATE payments SET paid_at_local = (paid_at AT TIME ZONE 'Europe/Zurich') WHERE paid_at IS NOT NULL;

-- 2.4: refunded_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at_local TIMESTAMP;
UPDATE payments SET refunded_at_local = (refunded_at AT TIME ZONE 'Europe/Zurich') WHERE refunded_at IS NOT NULL;

-- 2.5: scheduled_payment_date
ALTER TABLE payments ADD COLUMN IF NOT EXISTS scheduled_payment_date_local TIMESTAMP;
UPDATE payments SET scheduled_payment_date_local = (scheduled_payment_date AT TIME ZONE 'Europe/Zurich') WHERE scheduled_payment_date IS NOT NULL;

-- 2.6: scheduled_authorization_date
ALTER TABLE payments ADD COLUMN IF NOT EXISTS scheduled_authorization_date_local TIMESTAMP;
UPDATE payments SET scheduled_authorization_date_local = (scheduled_authorization_date AT TIME ZONE 'Europe/Zurich') WHERE scheduled_authorization_date IS NOT NULL;

-- 2.7: automatic_payment_processed_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS automatic_payment_processed_at_local TIMESTAMP;
UPDATE payments SET automatic_payment_processed_at_local = (automatic_payment_processed_at AT TIME ZONE 'Europe/Zurich') WHERE automatic_payment_processed_at IS NOT NULL;

-- 2.8: automatic_payment_consent_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS automatic_payment_consent_at_local TIMESTAMP;
UPDATE payments SET automatic_payment_consent_at_local = (automatic_payment_consent_at AT TIME ZONE 'Europe/Zurich') WHERE automatic_payment_consent_at IS NOT NULL;

-- 2.9: due_date
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date_local TIMESTAMP;
UPDATE payments SET due_date_local = (due_date AT TIME ZONE 'Europe/Zurich') WHERE due_date IS NOT NULL;

-- ============================================
-- STEP 3: Verify conversion before dropping old columns
-- ============================================
SELECT 
  'VERIFICATION' as status,
  id,
  created_at as old_utc,
  created_at_local as new_local,
  to_char(created_at AT TIME ZONE 'Europe/Zurich', 'YYYY-MM-DD HH24:MI:SS') as expected_local,
  to_char(created_at_local, 'YYYY-MM-DD HH24:MI:SS') as actual_local,
  CASE 
    WHEN to_char(created_at AT TIME ZONE 'Europe/Zurich', 'YYYY-MM-DD HH24:MI:SS') = 
         to_char(created_at_local, 'YYYY-MM-DD HH24:MI:SS') 
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as verification
FROM payments
WHERE created_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 4: Drop old columns and rename new ones (CAREFUL!)
-- ============================================
-- ⚠️ ONLY RUN THIS AFTER VERIFYING STEP 3 SHOWS ALL ✅ MATCH

-- IMPORTANT: Uncomment these lines only after verification!
-- Make sure to backup your database first!

/*
-- Drop old timezone-aware columns
ALTER TABLE payments DROP COLUMN IF EXISTS created_at;
ALTER TABLE payments DROP COLUMN IF EXISTS updated_at;
ALTER TABLE payments DROP COLUMN IF EXISTS paid_at;
ALTER TABLE payments DROP COLUMN IF EXISTS refunded_at;
ALTER TABLE payments DROP COLUMN IF EXISTS scheduled_payment_date;
ALTER TABLE payments DROP COLUMN IF EXISTS scheduled_authorization_date;
ALTER TABLE payments DROP COLUMN IF EXISTS automatic_payment_processed_at;
ALTER TABLE payments DROP COLUMN IF EXISTS automatic_payment_consent_at;
ALTER TABLE payments DROP COLUMN IF EXISTS due_date;

-- Rename local columns to original names
ALTER TABLE payments RENAME COLUMN created_at_local TO created_at;
ALTER TABLE payments RENAME COLUMN updated_at_local TO updated_at;
ALTER TABLE payments RENAME COLUMN paid_at_local TO paid_at;
ALTER TABLE payments RENAME COLUMN refunded_at_local TO refunded_at;
ALTER TABLE payments RENAME COLUMN scheduled_payment_date_local TO scheduled_payment_date;
ALTER TABLE payments RENAME COLUMN scheduled_authorization_date_local TO scheduled_authorization_date;
ALTER TABLE payments RENAME COLUMN automatic_payment_processed_at_local TO automatic_payment_processed_at;
ALTER TABLE payments RENAME COLUMN automatic_payment_consent_at_local TO automatic_payment_consent_at;
ALTER TABLE payments RENAME COLUMN due_date_local TO due_date;

-- Set defaults (local time NOW())
ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE payments ALTER COLUMN updated_at SET DEFAULT NOW();

-- Set NOT NULL constraints
ALTER TABLE payments ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE payments ALTER COLUMN updated_at SET NOT NULL;
*/

-- ============================================
-- STEP 5: After migration - verify final state
-- ============================================
/*
SELECT 
  'AFTER MIGRATION' as status,
  column_name,
  data_type,
  datetime_precision,
  is_nullable,
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
*/

-- ============================================
-- STEP 6: Verify cron job still works with local time
-- ============================================
/*
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_payment_date,
  NOW() as current_local_time,
  CASE 
    WHEN p.scheduled_payment_date <= NOW() THEN '✅ DUE (would be processed by cron)'
    ELSE '⏳ SCHEDULED (' || 
      ROUND(EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600, 1) || 'h remaining)'
  END as cron_status
FROM payments p
WHERE p.payment_status = 'authorized'
  AND p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date IS NOT NULL
ORDER BY p.scheduled_payment_date ASC;
*/

