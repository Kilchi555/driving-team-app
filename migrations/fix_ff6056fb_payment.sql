-- Mark specific stuck payment as completed
-- ff6056fb-8f24-4b70-9557-d9561f5b02f6

UPDATE payments
SET 
  payment_status = 'completed',
  paid_at = NOW(),
  updated_at = NOW(),
  metadata = metadata || jsonb_build_object(
    'manual_completion_reason', 'Manual fix - customer confirmed payment received',
    'manual_completion_at', NOW()::text,
    'completed_by', 'system_admin_fix'
  )
WHERE id = 'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
AND payment_status = 'pending';

-- Log the completion for audit trail
INSERT INTO webhook_logs (
  payment_id,
  wallee_state,
  payment_status_before,
  payment_status_after,
  success,
  error_message,
  raw_payload
)
SELECT 
  id,
  'FULFILL',
  'pending',
  'completed',
  true,
  'Manually completed - customer confirmed payment',
  jsonb_build_object(
    'reason', 'manual_admin_fix',
    'wallee_transaction_id', wallee_transaction_id
  )
FROM payments
WHERE id = 'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
AND payment_status = 'completed';

-- Verify
SELECT 
  id,
  first_name,
  last_name,
  payment_status,
  paid_at,
  total_amount_rappen / 100.0 as amount_chf
FROM (
  SELECT 
    p.id,
    COALESCE(u.first_name, 'N/A') as first_name,
    COALESCE(u.last_name, 'N/A') as last_name,
    p.payment_status,
    p.paid_at,
    p.total_amount_rappen
  FROM payments p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE p.id = 'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
) as result;
