-- Mark specific stuck payments as completed
-- After verification that these should be paid

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
WHERE id IN (
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54'
)
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
WHERE id IN (
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54'
)
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
  WHERE p.id IN (
    '716ae357-0410-4034-ad7e-4f41b6d2ef91',
    '57eb6b1f-96f0-4c55-8d02-b77cc510ff54'
  )
) as result;
