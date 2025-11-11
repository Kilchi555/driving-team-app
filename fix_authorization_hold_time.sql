-- Fix: Reduce Authorization Hold Time to prevent Wallee failures
-- Problem: 168 hours (7 days) is at the limit for Visa/Mastercard
-- Solution: Reduce to 72 hours (3 days) for better reliability

-- Step 1: Show current settings
SELECT 
  tenant_id,
  setting_value->>'automatic_authorization_hours_before' as current_auth_hours,
  setting_value->>'automatic_payment_hours_before' as payment_hours,
  setting_value
FROM tenant_settings
WHERE setting_key = 'payment_settings';

-- Step 2: Update to 72 hours (3 days)
UPDATE tenant_settings
SET 
  setting_value = jsonb_set(
    setting_value::jsonb,
    '{automatic_authorization_hours_before}',
    '72'::jsonb
  ),
  updated_at = NOW()
WHERE setting_key = 'payment_settings';

-- Step 3: Verify update
SELECT 
  tenant_id,
  setting_value->>'automatic_authorization_hours_before' as new_auth_hours,
  setting_value->>'automatic_payment_hours_before' as payment_hours,
  updated_at
FROM tenant_settings
WHERE setting_key = 'payment_settings';

-- Step 4: Check existing pending payments with long hold times
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.scheduled_authorization_date,
  p.scheduled_payment_date,
  a.start_time as appointment_time,
  EXTRACT(EPOCH FROM (p.scheduled_payment_date - p.scheduled_authorization_date)) / 3600 as hold_hours,
  CASE 
    WHEN EXTRACT(EPOCH FROM (p.scheduled_payment_date - p.scheduled_authorization_date)) / 3600 > 120 
    THEN '⚠️ TOO LONG'
    ELSE '✅ OK'
  END as status
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
WHERE p.payment_status IN ('pending', 'authorized')
  AND p.scheduled_authorization_date IS NOT NULL
  AND p.scheduled_payment_date IS NOT NULL
ORDER BY hold_hours DESC;

-- Step 5: Optional - Adjust existing pending payments with too long hold times
-- This moves the authorization date closer to the payment date
UPDATE payments
SET 
  scheduled_authorization_date = (
    scheduled_payment_date::timestamp - INTERVAL '72 hours'
  ),
  updated_at = NOW()
WHERE 
  payment_status = 'pending'
  AND scheduled_authorization_date IS NOT NULL
  AND scheduled_payment_date IS NOT NULL
  AND EXTRACT(EPOCH FROM (scheduled_payment_date - scheduled_authorization_date)) / 3600 > 120
  AND scheduled_authorization_date > NOW(); -- Only future authorizations

-- Step 6: Show updated payments
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_authorization_date,
  p.scheduled_payment_date,
  a.start_time as appointment_time,
  EXTRACT(EPOCH FROM (p.scheduled_payment_date - p.scheduled_authorization_date)) / 3600 as hold_hours,
  u.first_name || ' ' || u.last_name as customer
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.payment_status IN ('pending', 'authorized')
  AND p.scheduled_authorization_date IS NOT NULL
ORDER BY p.scheduled_authorization_date ASC;

