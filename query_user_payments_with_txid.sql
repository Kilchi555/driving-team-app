-- Query payments for user 8565bf3f-bcf8-45f3-a120-090ea05f3b8f with transaction IDs

SELECT 
  p.id,
  p.wallee_transaction_id,
  p.payment_status,
  p.amount,
  p.currency,
  p.payment_method,
  p.created_at,
  p.updated_at,
  p.paid_at,
  a.id as appointment_id,
  a.start_time,
  a.end_time,
  a.title,
  u.first_name,
  u.last_name,
  u.email
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.user_id = '8565bf3f-bcf8-45f3-a120-090ea05f3b8f'
ORDER BY p.created_at DESC;

-- Breakdown by status
SELECT 
  payment_status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN wallee_transaction_id IS NOT NULL THEN 1 END) as with_transaction_id,
  COUNT(CASE WHEN wallee_transaction_id IS NULL THEN 1 END) as without_transaction_id
FROM payments
WHERE user_id = '8565bf3f-bcf8-45f3-a120-090ea05f3b8f'
GROUP BY payment_status
ORDER BY payment_status;

-- Payments WITHOUT transaction_id (problematic!)
SELECT 
  id,
  payment_status,
  amount,
  created_at
FROM payments
WHERE user_id = '8565bf3f-bcf8-45f3-a120-090ea05f3b8f'
  AND wallee_transaction_id IS NULL
ORDER BY created_at DESC;
