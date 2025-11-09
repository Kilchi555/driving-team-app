-- Prüfe ob es pending_confirmation Termine gibt

SELECT 
  a.id,
  a.title,
  a.start_time,
  a.status,
  a.confirmation_token,
  a.user_id,
  u.first_name,
  u.last_name,
  u.email,
  p.id as payment_id,
  p.payment_status,
  p.total_amount_rappen
FROM appointments a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN payments p ON p.appointment_id = a.id
WHERE a.status = 'pending_confirmation'
  AND a.confirmation_token IS NOT NULL
  AND a.deleted_at IS NULL
ORDER BY a.start_time ASC;

