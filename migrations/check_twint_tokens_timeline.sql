-- Check TWINT tokens timeline
SELECT 
  cpm.id,
  cpm.payment_method_type,
  cpm.created_at,
  EXTRACT(DAY FROM NOW() - cpm.created_at) as days_old,
  cpm.wallee_token
FROM customer_payment_methods cpm
WHERE LOWER(cpm.payment_method_type) LIKE '%twint%'
ORDER BY cpm.created_at DESC;

-- Check last 5 payments to see if they created tokens
SELECT 
  p.id,
  p.payment_status,
  p.created_at,
  p.updated_at,
  (SELECT COUNT(*) FROM customer_payment_methods cpm 
   WHERE cpm.payment_method_type LIKE '%TWINT%' 
   AND cpm.created_at >= p.created_at 
   AND cpm.created_at <= p.updated_at) as tokens_created_during_payment
FROM payments p
WHERE p.payment_method = 'wallee'
ORDER BY p.created_at DESC
LIMIT 5;
