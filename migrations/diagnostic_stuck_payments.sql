-- Diagnostic: Find payments that are completed in Wallee but stuck in pending in our DB
-- This helps identify payments affected by the overwritten transaction ID bug

SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.created_at,
  p.updated_at,
  p.total_amount_rappen,
  p.user_id,
  p.tenant_id,
  -- Check if webhook_logs exist for this payment
  (SELECT COUNT(*) FROM webhook_logs wl WHERE wl.payment_id = p.id) as webhook_log_count,
  -- Check if this payment has entries in transaction history
  (SELECT COUNT(*) FROM payment_wallee_transactions pwt WHERE pwt.payment_id = p.id) as transaction_history_count,
  -- List all transaction IDs ever associated with this payment
  (SELECT string_agg(pwt.wallee_transaction_id, ', ' ORDER BY pwt.created_at DESC)
   FROM payment_wallee_transactions pwt WHERE pwt.payment_id = p.id) as all_transaction_ids
FROM payments p
WHERE 
  p.payment_status = 'pending'
  AND p.payment_method = 'wallee'
  AND p.wallee_transaction_id IS NOT NULL
  AND p.created_at < NOW() - INTERVAL '5 minutes'  -- older than 5 minutes
ORDER BY p.created_at DESC
LIMIT 50;
