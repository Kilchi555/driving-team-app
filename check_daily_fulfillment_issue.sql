-- Check for payments that might be re-processed daily
-- Issue: User gets daily fulfillment emails from Wallee

-- Find the specific payment with this Wallee transaction ID
-- Looking for: appointment-5179dd72-99be-48f2-9fbf-0a2a2a74d834-1762697...

SELECT 
  p.id,
  p.wallee_transaction_id,
  p.payment_status,
  p.automatic_payment_processed,
  p.automatic_payment_processed_at,
  p.scheduled_payment_date,
  p.paid_at,
  p.created_at,
  p.updated_at,
  a.id as appointment_id,
  a.status as appointment_status,
  a.start_time
FROM payments p
LEFT JOIN appointments a ON a.id = p.appointment_id
WHERE p.wallee_transaction_id LIKE '%431187809%' 
   OR p.id::text LIKE '%5179dd72%'
   OR p.appointment_id::text LIKE '%5179dd72%'
ORDER BY p.created_at DESC
LIMIT 5;

-- Check if there are any payments that are:
-- 1. Status = 'completed' or 'authorized'
-- 2. automatic_payment_processed = false (should be true!)
-- 3. This would cause them to be re-processed by cron job

SELECT 
  'Payments that might be re-processed' as issue,
  COUNT(*) as count
FROM payments p
WHERE p.payment_status IN ('completed', 'authorized')
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date <= NOW();

-- Show details of these problematic payments
SELECT 
  p.id,
  p.wallee_transaction_id,
  p.payment_status,
  p.automatic_payment_processed,
  p.scheduled_payment_date,
  p.paid_at,
  a.start_time,
  a.status as appointment_status
FROM payments p
LEFT JOIN appointments a ON a.id = p.appointment_id
WHERE p.payment_status IN ('completed', 'authorized')
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date <= NOW()
ORDER BY p.scheduled_payment_date DESC
LIMIT 10;

