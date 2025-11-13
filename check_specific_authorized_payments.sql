-- Check if specific authorized payments will be processed by cron job
-- Created: 2025-11-12
-- Purpose: Verify that authorized payments are correctly configured for automatic capture

-- ============================================
-- STEP 1: Find payments by description/metadata patterns
-- ============================================
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.automatic_payment_consent,
  p.automatic_payment_processed,
  p.scheduled_payment_date,
  p.scheduled_authorization_date,
  p.payment_method_id,
  p.total_amount_rappen,
  p.description,
  p.metadata,
  a.id as appointment_id,
  a.start_time as appointment_start,
  a.status as appointment_status,
  -- Check if cron would pick it up
  CASE 
    WHEN p.payment_status != 'authorized' THEN '❌ Not authorized'
    WHEN p.automatic_payment_consent != true THEN '❌ No consent'
    WHEN p.automatic_payment_processed = true THEN '❌ Already processed'
    WHEN p.scheduled_payment_date IS NULL THEN '❌ No scheduled date'
    WHEN p.scheduled_payment_date > NOW() THEN '⏳ Not due yet (' || 
      ROUND(EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600, 1) || 'h)'
    WHEN p.payment_method_id IS NULL THEN '❌ No payment method'
    WHEN p.wallee_transaction_id IS NULL THEN '❌ No transaction ID'
    ELSE '✅ READY FOR CAPTURE'
  END as cron_status,
  -- Time until/since scheduled capture
  CASE 
    WHEN p.scheduled_payment_date IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600, 1)
  END as hours_until_capture,
  p.created_at
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
WHERE 
  -- Search by appointment IDs from your list
  (
    p.appointment_id::text LIKE '%2a0e357a-86a4-4a5d-9f02-d2cba7f04fb7%'
    OR p.appointment_id::text LIKE '%bbe3bc8c-7a6a-42a8-b06f-ddfeac10a75b%'
    OR p.appointment_id::text LIKE '%91de9ebd-b288-4f04-affd-f4b9fe87ff13%'
    OR p.appointment_id::text LIKE '%5179dd72-99be-48f2-9bfb-0a2a2a74d834%'
    -- Or by description/metadata
    OR p.description ILIKE '%2a0e357a-86a4-4a5d-9f02-d2cba7f04fb7%'
    OR p.description ILIKE '%bbe3bc8c-7a6a-42a8-b06f-ddfeac10a75b%'
    OR p.description ILIKE '%91de9ebd-b288-4f04-affd-f4b9fe87ff13%'
    OR p.description ILIKE '%5179dd72-99be-48f2-9bfb-0a2a2a74d834%'
    OR p.metadata::text ILIKE '%2a0e357a-86a4-4a5d-9f02-d2cba7f04fb7%'
    OR p.metadata::text ILIKE '%bbe3bc8c-7a6a-42a8-b06f-ddfeac10a75b%'
    OR p.metadata::text ILIKE '%91de9ebd-b288-4f04-affd-f4b9fe87ff13%'
    OR p.metadata::text ILIKE '%5179dd72-99be-48f2-9bfb-0a2a2a74d834%'
  )
  -- Or search recent authorized payments
  OR (
    p.payment_status = 'authorized'
    AND p.created_at >= '2025-11-09'::timestamp
    AND p.total_amount_rappen IN (9500, 21500) -- CHF 95.00, CHF 215.00
  )
ORDER BY p.created_at DESC;

-- ============================================
-- STEP 2: Show ALL authorized payments that would be processed by cron
-- ============================================
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.scheduled_payment_date,
  p.scheduled_authorization_date,
  p.automatic_payment_consent,
  p.automatic_payment_processed,
  p.payment_method_id,
  p.total_amount_rappen / 100.0 as amount_chf,
  a.start_time as appointment_time,
  a.status as appointment_status,
  u.first_name || ' ' || u.last_name as customer,
  ROUND(EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600, 1) as hours_until_capture,
  p.created_at
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE 
  p.payment_status = 'authorized'
  AND p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date IS NOT NULL
  AND p.payment_method_id IS NOT NULL
  AND p.wallee_transaction_id IS NOT NULL
ORDER BY p.scheduled_payment_date ASC;

-- ============================================
-- STEP 3: Check cron job readiness for specific amounts
-- ============================================
SELECT 
  p.id,
  p.payment_status,
  p.total_amount_rappen / 100.0 as amount_chf,
  p.scheduled_payment_date,
  a.start_time as appointment_time,
  -- Detailed checks
  CASE WHEN p.payment_status = 'authorized' THEN '✅' ELSE '❌' END as has_authorized_status,
  CASE WHEN p.automatic_payment_consent = true THEN '✅' ELSE '❌' END as has_consent,
  CASE WHEN p.automatic_payment_processed = false THEN '✅' ELSE '❌' END as not_processed_yet,
  CASE WHEN p.scheduled_payment_date IS NOT NULL THEN '✅' ELSE '❌' END as has_scheduled_date,
  CASE WHEN p.scheduled_payment_date <= NOW() THEN '✅ DUE NOW' ELSE '⏳ ' || 
    ROUND(EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600, 1) || 'h' END as is_due,
  CASE WHEN p.payment_method_id IS NOT NULL THEN '✅' ELSE '❌' END as has_payment_method,
  CASE WHEN p.wallee_transaction_id IS NOT NULL THEN '✅' ELSE '❌' END as has_transaction_id,
  CASE WHEN a.status IN ('scheduled', 'completed') THEN '✅' ELSE '❌ ' || COALESCE(a.status, 'no appointment') END as appointment_valid,
  p.created_at
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
WHERE 
  p.total_amount_rappen IN (9500, 21500) -- CHF 95.00, CHF 215.00
  AND p.created_at >= '2025-11-09'::timestamp
ORDER BY p.created_at DESC;

-- ============================================
-- STEP 4: Simulate what cron would find RIGHT NOW
-- ============================================
-- This is the EXACT query the cron job uses (simplified)
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.scheduled_payment_date,
  p.total_amount_rappen / 100.0 as amount_chf,
  a.start_time as appointment_time,
  a.status as appointment_status,
  u.email as customer_email,
  '✅ WILL BE PROCESSED' as cron_action,
  p.created_at
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE 
  p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.payment_method = 'wallee'
  AND p.payment_method_id IS NOT NULL
  AND p.scheduled_payment_date IS NOT NULL
  AND p.scheduled_payment_date <= NOW()
  AND p.payment_status = 'authorized'
ORDER BY p.scheduled_payment_date ASC
LIMIT 50;

-- ============================================
-- STEP 5: Check cron job execution history
-- ============================================
-- Note: This requires a cron_logs table if you have one
-- Otherwise, check Vercel logs or Supabase logs

-- If you have cron logs:
-- SELECT * FROM cron_logs 
-- WHERE job_name = 'process-automatic-payments'
-- ORDER BY executed_at DESC
-- LIMIT 10;

-- ============================================
-- STEP 6: Manual test - show what needs to happen
-- ============================================
SELECT 
  '🔍 Summary of Authorized Payments' as info,
  COUNT(*) as total_authorized,
  COUNT(*) FILTER (WHERE scheduled_payment_date <= NOW()) as ready_for_capture,
  COUNT(*) FILTER (WHERE scheduled_payment_date > NOW()) as waiting_for_schedule,
  COUNT(*) FILTER (WHERE payment_method_id IS NULL) as missing_payment_method,
  COUNT(*) FILTER (WHERE wallee_transaction_id IS NULL) as missing_transaction_id
FROM payments
WHERE payment_status = 'authorized'
  AND automatic_payment_consent = true
  AND automatic_payment_processed = false;

