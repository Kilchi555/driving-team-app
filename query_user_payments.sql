-- Query payments for specific user
-- User ID: 8565bf3f-bcf8-45f3-a120-090ea05f3b8f

SELECT 
  p.id,
  p.appointment_id,
  p.user_id,
  p.total_amount_rappen,
  p.payment_status,
  p.payment_method,
  p.transaction_id,
  p.created_at,
  p.updated_at,
  -- Join with appointments to see details
  a.start_time,
  a.end_time,
  a.title,


FROM payments p
WHERE p.user_id = '8565bf3f-bcf8-45f3-a120-090ea05f3b8f'

