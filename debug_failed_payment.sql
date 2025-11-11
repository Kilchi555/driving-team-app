-- Debug failed payment: ae56e358-c9ea-491c-bb3b-51ba77d7f434
-- Transaction ID: 431390714

-- 1. Show full payment details
SELECT 
  p.*,
  a.start_time as appointment_start,
  a.status as appointment_status,
  u.first_name || ' ' || u.last_name as customer_name,
  u.email as customer_email
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434';

-- 2. Check payment method
SELECT 
  pm.*
FROM customer_payment_methods pm
WHERE pm.id = '68cee87f-0e63-4feb-ba7b-78d4b9e2f68f';

-- 3. Check if there are any related transactions
SELECT 
  *
FROM payments
WHERE user_id = '77eec3f1-b894-4b09-8a63-f204e649779e'
  AND wallee_transaction_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Timeline analysis
SELECT 
  'Created' as event,
  created_at as timestamp,
  EXTRACT(EPOCH FROM (created_at - created_at)) / 3600 as hours_from_creation
FROM payments
WHERE id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434'

UNION ALL

SELECT 
  'Scheduled Authorization' as event,
  scheduled_authorization_date as timestamp,
  EXTRACT(EPOCH FROM (scheduled_authorization_date - created_at)) / 3600 as hours_from_creation
FROM payments
WHERE id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434'

UNION ALL

SELECT 
  'Failed' as event,
  updated_at as timestamp,
  EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 as hours_from_creation
FROM payments
WHERE id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434'

UNION ALL

SELECT 
  'Scheduled Payment' as event,
  scheduled_payment_date as timestamp,
  EXTRACT(EPOCH FROM (scheduled_payment_date - created_at)) / 3600 as hours_from_creation
FROM payments
WHERE id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434'

ORDER BY timestamp;

-- 5. Check cron logs (if table exists)
-- Note: cron_logs table does not exist - skipping this check
-- Cron execution logs would need to be checked in Vercel/hosting logs

-- 6. Check if payment was manually triggered
SELECT 
  p.id,
  p.payment_status,
  p.created_at,
  p.updated_at,
  p.scheduled_authorization_date,
  p.wallee_transaction_id,
  CASE 
    WHEN p.updated_at < p.scheduled_authorization_date 
    THEN '⚠️ Failed BEFORE scheduled auth date'
    ELSE '✅ Failed AFTER scheduled auth date'
  END as timing_analysis
FROM payments p
WHERE p.id = 'ae56e358-c9ea-491c-bb3b-51ba77d7f434';

