-- Check if webhook_logs are NOW populated
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT payment_id) as unique_payments,
  MAX(created_at) as latest_webhook
FROM webhook_logs;

-- Show all webhooks for the latest payment
SELECT 
  wl.id,
  wl.payment_id,
  wl.transaction_id,
  wl.wallee_state,
  wl.success,
  wl.error_message,
  wl.created_at
FROM webhook_logs wl
ORDER BY wl.created_at DESC
LIMIT 10;
