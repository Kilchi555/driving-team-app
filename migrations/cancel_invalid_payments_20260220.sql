-- Mark stuck payments as cancelled with explanation for manual review
-- These payments have invalid/non-existent Wallee transaction IDs
-- Better to cancel and let users re-pay with fresh payment records

UPDATE payments
SET 
  payment_status = 'cancelled',
  updated_at = NOW(),
  metadata = metadata || jsonb_build_object(
    'cancellation_reason', 'Invalid Wallee transaction ID - not found in Wallee',
    'cancelled_at', NOW()::text,
    'cancelled_by', 'system_batch_fix',
    'note', 'Payment stuck in pending due to transaction ID mismatch. User should create new payment.'
  )
WHERE id IN (
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54',
  '0f0acba5-7a8a-4c44-a02c-f8c2538f0d36',
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '62acedcb-40bc-40f7-9ae6-dc31d4b319cb',
  '99f4ee32-5fb9-43b0-84e3-2f8ed0c05c37',
  '9f295b22-cdf5-44b3-8781-754788285221',
  'b3110c8c-8ef7-4c23-b1f1-b02f8cec72b9',
  'e1056d02-3911-4bac-a13d-9bee661e1d0c',
  'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
)
AND payment_status = 'pending';

-- Log the cancellations for audit trail
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
  'UNKNOWN',
  'pending',
  'cancelled',
  false,
  'Cancelled due to invalid Wallee transaction ID - not found in Wallee system',
  jsonb_build_object(
    'reason', 'invalid_transaction_id',
    'wallee_transaction_id', wallee_transaction_id,
    'action', 'system_cleanup'
  )
FROM payments
WHERE id IN (
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54',
  '0f0acba5-7a8a-4c44-a02c-f8c2538f0d36',
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '62acedcb-40bc-40f7-9ae6-dc31d4b319cb',
  '99f4ee32-5fb9-43b0-84e3-2f8ed0c05c37',
  '9f295b22-cdf5-44b3-8781-754788285221',
  'b3110c8c-8ef7-4c23-b1f1-b02f8cec72b9',
  'e1056d02-3911-4bac-a13d-9bee661e1d0c',
  'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
)
AND payment_status = 'cancelled';

-- Verify
SELECT 
  COUNT(*) as total_affected,
  SUM(CASE WHEN payment_status = 'cancelled' THEN 1 ELSE 0 END) as now_cancelled,
  SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as still_pending
FROM payments
WHERE id IN (
  '57eb6b1f-96f0-4c55-8d02-b77cc510ff54',
  '0f0acba5-7a8a-4c44-a02c-f8c2538f0d36',
  '716ae357-0410-4034-ad7e-4f41b6d2ef91',
  '62acedcb-40bc-40f7-9ae6-dc31d4b319cb',
  '99f4ee32-5fb9-43b0-84e3-2f8ed0c05c37',
  '9f295b22-cdf5-44b3-8781-754788285221',
  'b3110c8c-8ef7-4c23-b1f1-b02f8cec72b9',
  'e1056d02-3911-4bac-a13d-9bee661e1d0c',
  'ff6056fb-8f24-4b70-9557-d9561f5b02f6'
);
