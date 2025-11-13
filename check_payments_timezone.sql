-- Check if payments table stores times in local time or UTC
-- Created: 2025-11-12
-- Purpose: Verify timezone handling in payments table

-- ============================================
-- STEP 1: Check current database timezone settings
-- ============================================
SELECT 
  name,
  setting,
  description
FROM pg_settings
WHERE name IN ('timezone', 'TimeZone', 'log_timezone');

-- ============================================
-- STEP 2: Check payments table column definitions
-- ============================================
SELECT 
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
    'refunded_at', 
    'due_date',
    'scheduled_payment_date',
    'scheduled_authorization_date',
    'automatic_payment_processed_at',
    'automatic_payment_consent_at'
  )
ORDER BY ordinal_position;

-- ============================================
-- STEP 3: Check actual timestamp values from recent payments
-- ============================================
SELECT 
  id,
  created_at,
  -- Show raw timestamp (as stored in DB)
  created_at AT TIME ZONE 'UTC' as created_at_utc,
  -- Show in Swiss time
  created_at AT TIME ZONE 'Europe/Zurich' as created_at_swiss,
  -- Show current database timezone interpretation
  created_at::text as created_at_raw_text,
  -- Extract timezone info
  EXTRACT(TIMEZONE_HOUR FROM created_at) as tz_hour,
  EXTRACT(TIMEZONE_MINUTE FROM created_at) as tz_minute,
  updated_at,
  scheduled_payment_date,
  scheduled_authorization_date,
  payment_status
FROM payments
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 4: Test current session timezone
-- ============================================
SELECT 
  NOW() as current_time,
  NOW() AT TIME ZONE 'UTC' as current_time_utc,
  NOW() AT TIME ZONE 'Europe/Zurich' as current_time_swiss,
  CURRENT_TIMESTAMP as current_timestamp,
  timezone('UTC', NOW()) as now_in_utc,
  timezone('Europe/Zurich', NOW()) as now_in_swiss;

-- ============================================
-- STEP 5: Check specific authorized payments
-- ============================================
SELECT 
  p.id,
  p.payment_status,
  p.total_amount_rappen / 100.0 as amount_chf,
  -- All timestamps in different formats
  to_char(p.created_at, 'YYYY-MM-DD HH24:MI:SS TZ') as created_at_formatted,
  to_char(p.updated_at, 'YYYY-MM-DD HH24:MI:SS TZ') as updated_at_formatted,
  to_char(p.scheduled_authorization_date, 'YYYY-MM-DD HH24:MI:SS TZ') as auth_date_formatted,
  to_char(p.scheduled_payment_date, 'YYYY-MM-DD HH24:MI:SS TZ') as payment_date_formatted,
  to_char(p.automatic_payment_processed_at, 'YYYY-MM-DD HH24:MI:SS TZ') as processed_at_formatted,
  -- Show difference between created and updated
  EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 60 as minutes_between_create_update
FROM payments p
WHERE p.payment_status = 'authorized'
  AND p.created_at >= '2025-11-09'::timestamp
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 6: Compare with appointments table
-- ============================================
SELECT 
  a.id as appointment_id,
  to_char(a.start_time, 'YYYY-MM-DD HH24:MI:SS TZ') as appointment_start,
  to_char(a.created_at, 'YYYY-MM-DD HH24:MI:SS TZ') as appointment_created,
  p.id as payment_id,
  to_char(p.created_at, 'YYYY-MM-DD HH24:MI:SS TZ') as payment_created,
  to_char(p.scheduled_payment_date, 'YYYY-MM-DD HH24:MI:SS TZ') as payment_scheduled
FROM appointments a
JOIN payments p ON p.appointment_id = a.id
WHERE a.created_at >= NOW() - INTERVAL '7 days'
  AND p.scheduled_payment_date IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: Recommendation
-- ============================================
SELECT 
  CASE 
    WHEN CURRENT_SETTING('timezone') = 'UTC' THEN
      '⚠️ Database is set to UTC. Times are converted on display.'
    WHEN CURRENT_SETTING('timezone') ILIKE '%zurich%' OR CURRENT_SETTING('timezone') ILIKE '%europe%' THEN
      '✅ Database is set to European timezone. Times should be in local time.'
    ELSE
      '❓ Database timezone: ' || CURRENT_SETTING('timezone')
  END as timezone_status,
  CURRENT_SETTING('timezone') as current_db_timezone,
  NOW() as current_db_time,
  NOW() AT TIME ZONE 'Europe/Zurich' as swiss_local_time;

-- ============================================
-- STEP 8: Check if times match expected Swiss local time
-- ============================================
-- This compares if timestamps are already in Swiss time or need conversion
SELECT 
  'Verification' as check_type,
  NOW() as db_now,
  NOW() AT TIME ZONE 'Europe/Zurich' as swiss_now,
  CASE 
    WHEN to_char(NOW(), 'HH24:MI') = to_char(NOW() AT TIME ZONE 'Europe/Zurich', 'HH24:MI') THEN
      '✅ Database already stores in Swiss local time (or timezone matches)'
    ELSE
      '⚠️ Database stores in different timezone (likely UTC). Offset: ' || 
      EXTRACT(HOUR FROM (NOW() - (NOW() AT TIME ZONE 'Europe/Zurich'))) || ' hours'
  END as result;

