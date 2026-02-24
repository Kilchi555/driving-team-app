-- ADVANCED: Find payments that have successful webhooks but wrong status
-- This shows the REAL extent of the bug: payments where webhooks DID arrive but status wasn't updated

WITH webhook_analysis AS (
  SELECT 
    wl.payment_id,
    COUNT(*) as webhook_count,
    MAX(CASE WHEN wl.success = true THEN wl.wallee_state END) as latest_successful_wallee_state,
    MAX(CASE WHEN wl.success = true THEN wl.created_at END) as latest_successful_webhook_at,
    STRING_AGG(
      DISTINCT CASE WHEN wl.success = true THEN wl.wallee_state END,
      ', '
    ) as all_successful_states,
    COUNT(CASE WHEN wl.success = false THEN 1 END) as failed_webhook_count
  FROM webhook_logs wl
  WHERE wl.payment_id IS NOT NULL
  GROUP BY wl.payment_id
)
SELECT 
  p.id as payment_id,
  p.payment_status as current_status,
  wa.latest_successful_wallee_state as wallee_reported_state,
  CASE 
    WHEN wa.latest_successful_wallee_state IN ('FULFILL', 'COMPLETED', 'SUCCESSFUL') 
      AND p.payment_status = 'pending'
    THEN '🔴 BUG: Wallee says COMPLETED but app says PENDING'
    WHEN wa.latest_successful_wallee_state IS NULL AND p.payment_status = 'pending'
    THEN '⚠️ No webhook logs found'
    WHEN p.payment_status != 'pending'
    THEN '✅ Status updated correctly'
    ELSE '❓ Unknown state'
  END as diagnosis,
  wa.webhook_count,
  wa.failed_webhook_count,
  wa.latest_successful_webhook_at,
  p.created_at as payment_created_at,
  p.updated_at as payment_updated_at,
  p.total_amount_rappen,
  p.wallee_transaction_id as current_transaction_id,
  (SELECT STRING_AGG(pwt.wallee_transaction_id, ', ' ORDER BY pwt.created_at DESC)
   FROM payment_wallee_transactions pwt WHERE pwt.payment_id = p.id) as all_transaction_history,
  p.user_id,
  p.tenant_id
FROM payments p
LEFT JOIN webhook_analysis wa ON p.id = wa.payment_id
WHERE 
  p.payment_method = 'wallee'
  AND p.created_at > NOW() - INTERVAL '30 days'  -- last 30 days
  AND (
    -- Either has failed webhooks or pending status with webhooks arriving
    wa.webhook_count > 0 
    OR p.payment_status = 'pending'
  )
ORDER BY 
  CASE 
    WHEN wa.latest_successful_wallee_state IN ('FULFILL', 'COMPLETED', 'SUCCESSFUL') 
      AND p.payment_status = 'pending'
    THEN 0  -- Stuck payments first
    ELSE 1
  END,
  p.created_at DESC
LIMIT 100;
