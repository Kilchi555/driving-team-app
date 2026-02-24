-- Final verification: All 3 fixes working
-- Check the newest payment and its logs

SELECT 
  'PAYMENT' as check_type,
  p.id as payment_id,
  p.payment_status,
  p.wallee_transaction_id,
  COUNT(*) OVER (PARTITION BY p.id) as record_count
FROM payments p
WHERE p.payment_method = 'wallee'
ORDER BY p.created_at DESC
LIMIT 1

UNION ALL

SELECT
  'TRANSACTION_HISTORY' as check_type,
  pwt.payment_id,
  pwt.wallee_transaction_id::text,
  NULL,
  COUNT(*) OVER (PARTITION BY pwt.payment_id) as total_transactions
FROM payment_wallee_transactions pwt
WHERE pwt.payment_id = (SELECT id FROM payments WHERE payment_method = 'wallee' ORDER BY created_at DESC LIMIT 1)
ORDER BY pwt.created_at ASC

UNION ALL

SELECT
  'WEBHOOK_LOGS' as check_type,
  wl.payment_id::text,
  wl.transaction_id,
  wl.wallee_state,
  COUNT(*) OVER (PARTITION BY wl.payment_id) as total_webhooks
FROM webhook_logs wl
WHERE wl.payment_id = (SELECT id FROM payments WHERE payment_method = 'wallee' ORDER BY created_at DESC LIMIT 1)
ORDER BY wl.created_at DESC;
