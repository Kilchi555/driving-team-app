-- Final verification of all 3 fixes

-- 1. TRANSACTION HISTORY - wurden beide Wallee-Transaktionen gespeichert?
SELECT 
  pwt.payment_id,
  pwt.wallee_transaction_id,
  pwt.created_at,
  pwt.merchant_reference
FROM payment_wallee_transactions pwt
WHERE pwt.payment_id = 'a731c38a-72ed-4153-8250-8c0d0b82117b'
ORDER BY pwt.created_at ASC;

-- 2. WEBHOOK LOGS - wurden die Webhooks protokolliert?
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

-- 3. PAYMENT - zeigt aktuelle Status
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id as current_transaction_id,
  p.paid_at,
  p.created_at,
  p.updated_at
FROM payments p
WHERE p.id = 'a731c38a-72ed-4153-8250-8c0d0b82117b';
