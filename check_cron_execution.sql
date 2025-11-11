-- Check if cron job is running and processing payments correctly

-- 1. Check payments that should have been captured already
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_payment_date,
  p.automatic_payment_processed,
  p.automatic_payment_processed_at,
  p.wallee_transaction_id,
  a.start_time as appointment_time,
  u.first_name || ' ' || u.last_name as customer,
  CASE 
    WHEN p.scheduled_payment_date < NOW() AND p.automatic_payment_processed = false
    THEN '⚠️ OVERDUE - Should have been captured!'
    WHEN p.scheduled_payment_date > NOW()
    THEN '✅ Future payment'
    ELSE '✅ Processed'
  END as status_check,
  EXTRACT(EPOCH FROM (NOW() - p.scheduled_payment_date)) / 3600 as hours_overdue
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.payment_status = 'authorized'
  AND p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date IS NOT NULL
ORDER BY p.scheduled_payment_date ASC;

-- 2. Check if there are any payments stuck in 'authorized' status
SELECT 
  COUNT(*) as stuck_authorized_count,
  MIN(scheduled_payment_date) as oldest_scheduled_date,
  MAX(scheduled_payment_date) as newest_scheduled_date
FROM payments
WHERE payment_status = 'authorized'
  AND automatic_payment_processed = false
  AND scheduled_payment_date < NOW();

-- 3. Check recent payment processing activity
SELECT 
  p.id,
  p.payment_status,
  p.automatic_payment_processed,
  p.automatic_payment_processed_at,
  p.scheduled_payment_date,
  p.updated_at,
  EXTRACT(EPOCH FROM (p.updated_at - p.scheduled_payment_date)) / 3600 as hours_after_scheduled
FROM payments p
WHERE p.automatic_payment_processed_at IS NOT NULL
  AND p.automatic_payment_processed_at > NOW() - INTERVAL '24 hours'
ORDER BY p.automatic_payment_processed_at DESC
LIMIT 10;

-- 4. Check if vercel.json has cron configuration
-- This needs to be checked manually in the codebase

-- 5. Recommendation
SELECT 
  '⚠️ CRON JOB MAY NOT BE RUNNING!' as alert,
  'Check Vercel Dashboard → Project → Cron Jobs' as action_1,
  'Or manually trigger: POST /api/cron/process-automatic-payments' as action_2,
  'Verify vercel.json has cron configuration' as action_3
WHERE EXISTS (
  SELECT 1 FROM payments
  WHERE payment_status = 'authorized'
    AND automatic_payment_processed = false
    AND scheduled_payment_date < NOW() - INTERVAL '1 hour'
);

