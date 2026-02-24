-- Check if webhook_logs now has entries
SELECT 
  COUNT(*) as total_webhook_logs,
  COUNT(DISTINCT payment_id) as payments_with_logs,
  MAX(created_at) as latest_webhook
FROM webhook_logs;

-- Show latest webhooks
SELECT 
  wl.id,
  wl.payment_id,
  wl.transaction_id,
  wl.wallee_state,
  wl.success,
  wl.created_at
FROM webhook_logs wl
ORDER BY wl.created_at DESC
LIMIT 10;
