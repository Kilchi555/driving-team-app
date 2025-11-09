-- Fix payments that have been paid (paid_at is set) but status is still 'authorized'
-- These payments were captured successfully but the webhook overwrote the status

UPDATE payments
SET 
  payment_status = 'completed',
  updated_at = NOW()
WHERE 
  payment_status = 'authorized'
  AND paid_at IS NOT NULL
  AND automatic_payment_processed = true;

-- Verify the update
SELECT 
  id,
  appointment_id,
  payment_status,
  paid_at,
  automatic_payment_processed,
  automatic_payment_processed_at,
  wallee_transaction_id
FROM payments
WHERE 
  payment_status = 'completed'
  AND paid_at IS NOT NULL
  AND automatic_payment_processed = true
ORDER BY paid_at DESC
LIMIT 10;

