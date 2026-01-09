-- Inspect payments for user 423a937b-1631-4b38-b641-36da10c91a1f

-- 1. Get user info
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  tenant_id,
  onboarding_status,
  is_active
FROM users 
WHERE id = '423a937b-1631-4b38-b641-36da10c91a1f';

-- 2. Get all payments for this user
SELECT 
  p.id,
  p.appointment_id,
  p.payment_status,
  p.payment_method,
  p.total_amount_rappen,
  p.total_amount_rappen / 100.0 as total_chf,
  p.lesson_price_rappen / 100.0 as lesson_chf,
  p.admin_fee_rappen / 100.0 as admin_fee_chf,
  p.products_price_rappen / 100.0 as products_chf,
  p.discount_amount_rappen / 100.0 as discount_chf,
  p.credit_used_rappen / 100.0 as credit_used_chf,
  p.wallee_transaction_id,
  p.paid_at,
  p.created_at,
  p.metadata
FROM payments p
WHERE p.user_id = '423a937b-1631-4b38-b641-36da10c91a1f'
ORDER BY p.created_at DESC;

-- 3. Get appointments with payment info
SELECT 
  a.id as appointment_id,
  a.start_time,
  a.end_time,
  a.title,
  a.status as appointment_status,
  a.event_type_code,
  p.id as payment_id,
  p.payment_status,
  p.payment_method,
  p.total_amount_rappen / 100.0 as total_chf,
  p.wallee_transaction_id,
  p.paid_at
FROM appointments a
LEFT JOIN payments p ON p.appointment_id = a.id
WHERE a.user_id = '423a937b-1631-4b38-b641-36da10c91a1f'
ORDER BY a.start_time DESC;

-- 4. Get customer payment methods (tokens)
SELECT 
  id,
  payment_method_type,
  wallee_token_id,
  card_last4,
  card_brand,
  is_default,
  is_active,
  created_at,
  last_used_at
FROM customer_payment_methods
WHERE user_id = '423a937b-1631-4b38-b641-36da10c91a1f'
ORDER BY created_at DESC;

-- 5. Get student credit balance
SELECT 
  balance_rappen,
  balance_rappen / 100.0 as balance_chf,
  updated_at
FROM student_credits
WHERE user_id = '423a937b-1631-4b38-b641-36da10c91a1f';

-- 6. Get credit transactions
SELECT 
  id,
  transaction_type,
  amount_rappen / 100.0 as amount_chf,
  balance_before_rappen / 100.0 as balance_before_chf,
  balance_after_rappen / 100.0 as balance_after_chf,
  reference_type,
  reference_id,
  notes,
  created_at
FROM credit_transactions
WHERE user_id = '423a937b-1631-4b38-b641-36da10c91a1f'
ORDER BY created_at DESC
LIMIT 20;
