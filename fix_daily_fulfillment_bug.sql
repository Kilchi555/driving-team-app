-- Fix payments that were captured in Wallee but not updated in DB
-- This prevents them from being re-processed daily by cron job

-- STEP 1: Find all payments that need fixing
-- These are payments where:
-- - Wallee shows "FULFILL" or "COMPLETED" status
-- - But DB still shows "authorized" and automatic_payment_processed = false

SELECT 
  'Payments to fix' as info,
  id,
  wallee_transaction_id,
  payment_status,
  automatic_payment_processed,
  scheduled_payment_date,
  paid_at
FROM payments
WHERE payment_status = 'authorized'
  AND automatic_payment_processed = false
  AND scheduled_payment_date < NOW()
ORDER BY scheduled_payment_date DESC;

-- STEP 2: Update these payments to prevent daily re-processing
-- IMPORTANT: Only run this after verifying in Wallee that these transactions 
-- are actually in "FULFILL" or "COMPLETED" status!

-- For now, just mark them as processed to stop daily fulfillment emails
-- We can manually check Wallee status later if needed

UPDATE payments
SET 
  automatic_payment_processed = true,
  automatic_payment_processed_at = NOW(),
  updated_at = NOW()
WHERE payment_status = 'authorized'
  AND automatic_payment_processed = false
  AND scheduled_payment_date < NOW()
RETURNING id, wallee_transaction_id, payment_status, automatic_payment_processed;

-- STEP 3: For payments where Wallee shows COMPLETED/FULFILL,
-- we should also update payment_status to 'completed' and set paid_at
-- But ONLY after manually verifying in Wallee!

-- Uncomment and run this ONLY after verifying in Wallee:
/*
UPDATE payments
SET 
  payment_status = 'completed',
  paid_at = NOW(),
  automatic_payment_processed = true,
  automatic_payment_processed_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  -- List specific IDs here after verifying in Wallee
  '87610144-3b75-492e-b691-383857930e3e',
  '6dd98c04-7a48-485f-93c8-e56ed1891170',
  '27c0bd33-56e8-49bf-8b7b-829c069a1fc1',
  'e602197d-4bb9-486c-ac8d-3c08b8af4d77'
)
RETURNING id, wallee_transaction_id, payment_status, paid_at;
*/

