-- Migration: Create missing payments for all appointments without payments
-- This fixes the issue where appointments were created without corresponding payments
-- 
-- PROBLEM:
-- - Appointments created before payment creation logic was moved to API
-- - Some appointments created without payment records
-- 
-- SOLUTION:
-- - Identify all appointments without payments
-- - Create corresponding payment records
-- - Set status to 'pending_confirmation'
-- - Amount based on appointment type

BEGIN;

-- Find appointments without payments and create payment records
INSERT INTO payments (
  appointment_id,
  user_id,
  tenant_id,
  total_amount_rappen,
  payment_method,
  payment_status,
  description,
  currency,
  created_at,
  updated_at
)
SELECT 
  a.id as appointment_id,
  a.user_id,
  a.tenant_id,
  CASE
    WHEN a.type = 'B' THEN 9500      -- CHF 95.00
    WHEN a.type = 'BE' THEN 12000    -- CHF 120.00
    ELSE 9500                        -- Default CHF 95.00
  END as total_amount_rappen,
  'wallee' as payment_method,
  'pending_confirmation' as payment_status,
  COALESCE(a.title, CONCAT('Fahrlektio ', a.type)) as description,
  'CHF' as currency,
  NOW() as created_at,
  NOW() as updated_at
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
  AND a.deleted_at IS NULL
  AND a.status != 'cancelled'
  AND a.status != 'aborted';

COMMIT;

