-- SQL Script to link existing invoice payments with company_billing_addresses
-- This script tries to match invoice payments with company billing addresses based on user_id

-- Update payments table to link with company_billing_addresses
-- Match via users table: payments.user_id -> users.id -> users.auth_user_id -> company_billing_addresses.created_by
UPDATE payments 
SET company_billing_address_id = cba.id
FROM company_billing_addresses cba
JOIN users u ON cba.created_by = u.id  -- Join via users table
WHERE payments.payment_method = 'invoice'
  AND payments.company_billing_address_id IS NULL
  AND payments.user_id = u.id  -- Match payment user_id with users.id
  AND cba.is_active = true
  AND cba.created_at = (
    -- Get the most recent active billing address for this user
    SELECT MAX(created_at) 
    FROM company_billing_addresses cba2 
    WHERE cba2.created_by = cba.created_by 
      AND cba2.is_active = true
  );

-- Show what was updated
SELECT 
  p.id as payment_id,
  p.appointment_id,
  p.user_id,
  p.payment_method,
  p.created_at as payment_created,
  p.company_billing_address_id,
  cba.company_name,
  cba.contact_person,
  cba.created_at as address_created
FROM payments p
LEFT JOIN company_billing_addresses cba ON p.company_billing_address_id = cba.id
WHERE p.payment_method = 'invoice'
ORDER BY p.created_at DESC
LIMIT 10;
