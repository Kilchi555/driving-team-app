-- Check WEBHOOK LOGS for this payment
SELECT 
  wl.id,
  wl.payment_id,
  wl.transaction_id,
  wl.wallee_state,
  wl.success,
  wl.error_message,
  wl.created_at
FROM webhook_logs wl
WHERE wl.payment_id = 'a731c38a-72ed-4153-8250-8c0d0b82117b'
ORDER BY wl.created_at DESC;
