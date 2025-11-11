-- Debug: Warum wurde das Payment nicht vom Cron captured?
-- Payment ID: cfefac9c-f35b-4c94-a2f4-bd1d1eeb07c5

-- 1. Prüfe alle Bedingungen einzeln
SELECT 
  p.id,
  p.automatic_payment_consent = true as check_consent,
  p.automatic_payment_processed = false as check_not_processed,
  p.payment_method = 'wallee' as check_wallee,
  p.payment_method_id IS NOT NULL as check_has_method_id,
  p.scheduled_payment_date IS NOT NULL as check_has_scheduled_date,
  p.scheduled_payment_date <= NOW() as check_date_due,
  p.payment_status = 'authorized' as check_authorized,
  -- Zeige die Werte
  p.automatic_payment_consent,
  p.automatic_payment_processed,
  p.payment_method,
  p.payment_method_id,
  p.scheduled_payment_date,
  p.payment_status,
  NOW() as current_time
FROM payments p
WHERE p.id = 'cfefac9c-f35b-4c94-a2f4-bd1d1eeb07c5';

-- 2. Simuliere die exakte Cron-Query
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_payment_date,
  p.automatic_payment_processed,
  p.payment_method_id,
  p.wallee_transaction_id,
  '✅ SHOULD BE FOUND BY CRON' as result
FROM payments p
WHERE p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.payment_method = 'wallee'
  AND p.payment_method_id IS NOT NULL
  AND p.scheduled_payment_date IS NOT NULL
  AND p.scheduled_payment_date <= NOW()
  AND p.payment_status = 'authorized'
  AND p.id = 'cfefac9c-f35b-4c94-a2f4-bd1d1eeb07c5';

-- 3. Prüfe ob es IRGENDWELCHE Payments gibt, die der Cron finden sollte
SELECT 
  COUNT(*) as total_payments_due,
  MIN(scheduled_payment_date) as earliest_due,
  MAX(scheduled_payment_date) as latest_due
FROM payments
WHERE automatic_payment_consent = true
  AND automatic_payment_processed = false
  AND payment_method = 'wallee'
  AND payment_method_id IS NOT NULL
  AND scheduled_payment_date IS NOT NULL
  AND scheduled_payment_date <= NOW()
  AND payment_status = 'authorized';

-- 4. Zeige ALLE Payments die der Cron finden sollte
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_payment_date,
  p.wallee_transaction_id,
  u.first_name || ' ' || u.last_name as customer,
  EXTRACT(EPOCH FROM (NOW() - p.scheduled_payment_date)) / 3600 as hours_overdue
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
WHERE p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.payment_method = 'wallee'
  AND p.payment_method_id IS NOT NULL
  AND p.scheduled_payment_date IS NOT NULL
  AND p.scheduled_payment_date <= NOW()
  AND p.payment_status = 'authorized'
ORDER BY p.scheduled_payment_date ASC;

-- 5. Prüfe ob getSupabaseAdmin() RLS umgeht
-- Falls RLS aktiv ist, könnte der Cron die Payments nicht sehen
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'payments'
  AND cmd = 'SELECT';

