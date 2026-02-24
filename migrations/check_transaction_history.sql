-- Check TRANSACTION HISTORY for this payment
SELECT 
  pwt.payment_id,
  pwt.wallee_transaction_id,
  pwt.created_at,
  pwt.merchant_reference
FROM payment_wallee_transactions pwt
WHERE pwt.payment_id = 'a731c38a-72ed-4153-8250-8c0d0b82117b'
ORDER BY pwt.created_at ASC;
