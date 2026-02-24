-- TEST RESULT ANALYSIS: TWINT payment - abort then complete
-- See what happened in our system

-- 1. CHECK PAYMENT STATUS
SELECT 
  p.id as payment_id,
  p.payment_status,
  p.wallee_transaction_id as current_transaction_id,
  p.created_at,
  p.updated_at,
  p.paid_at,
  p.total_amount_rappen / 100.0 as amount_chf
FROM payments p
WHERE p.payment_method = 'wallee'
ORDER BY p.created_at DESC
LIMIT 1;

-- 2. CHECK TRANSACTION HISTORY (NEW - from our fix!)
SELECT 
  pwt.payment_id,
  pwt.wallee_transaction_id,
  pwt.created_at as saved_at,
  pwt.merchant_reference,
  COUNT(*) OVER (PARTITION BY pwt.payment_id) as total_transactions_for_payment
FROM payment_wallee_transactions pwt
ORDER BY pwt.created_at DESC
LIMIT 10;

-- 3. CHECK WEBHOOK LOGS (this shows what Wallee sent)
SELECT 
  wl.id,
  wl.payment_id,
  wl.transaction_id as wallee_transaction_id,
  wl.wallee_state,
  wl.success,
  wl.error_message,
  wl.created_at,
  wl.raw_payload
FROM webhook_logs wl
ORDER BY wl.created_at DESC
LIMIT 10;

-- 4. DETAILED: Compare what Wallee sent vs what we stored
WITH latest_payment AS (
  SELECT p.id, p.payment_id, p.current_transaction_id, p.payment_status
  FROM (
    SELECT 
      id, 
      id as payment_id,
      wallee_transaction_id as current_transaction_id, 
      payment_status,
      created_at
    FROM payments
    WHERE payment_method = 'wallee'
    ORDER BY created_at DESC
    LIMIT 1
  ) p
)
SELECT 
  'PAYMENT' as source,
  lp.payment_id,
  lp.current_transaction_id,
  lp.payment_status,
  NULL::varchar as wallee_state,
  NULL::timestamp as webhook_received_at
FROM latest_payment lp

UNION ALL

SELECT 
  'WEBHOOK' as source,
  wl.payment_id,
  wl.transaction_id::varchar,
  NULL as payment_status,
  wl.wallee_state,
  wl.created_at
FROM webhook_logs wl
WHERE wl.payment_id = (SELECT id FROM payments WHERE payment_method = 'wallee' ORDER BY created_at DESC LIMIT 1)
ORDER BY webhook_received_at DESC NULLS FIRST;

-- 5. CHECK IF TOKENS WERE SAVED (should be NONE for TWINT!)
SELECT 
  cpm.id,
  cpm.payment_method_type,
  cpm.wallee_token,
  cpm.created_at
FROM customer_payment_methods cpm
WHERE cpm.payment_method_type LIKE '%TWINT%'
   OR cpm.payment_method_type LIKE '%twint%'
LIMIT 5;
