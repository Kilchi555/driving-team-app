-- Final check: Are webhook_logs now being populated after RLS fix?
SELECT 
  COUNT(*) as total_logs,
  MAX(created_at) as latest_log,
  COUNT(DISTINCT payment_id) as unique_payments
FROM webhook_logs;

-- Show the latest webhooks
SELECT 
  id,
  payment_id,
  transaction_id,
  wallee_state,
  success,
  error_message,
  created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 5;
