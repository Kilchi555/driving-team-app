-- Debug: Check what payments exist for the test user
SELECT 
  p.id,
  p.user_id,
  p.appointment_id,
  p.payment_status,
  p.payment_method,
  p.total_amount_rappen,
  a.start_time,
  u.email
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE u.email = 'pascal_kilchenmann@icloud.com'
ORDER BY p.created_at DESC
LIMIT 20;
