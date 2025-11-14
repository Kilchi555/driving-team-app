-- Prüfe Payment Timing für diese Zahlung
SELECT 
  p.id,
  p.scheduled_payment_date,
  a.start_time as appointment_start,
  -- Differenz in Stunden
  EXTRACT(EPOCH FROM (a.start_time - p.scheduled_payment_date))/3600 as hours_between,
  -- In welcher Zeitzone wurde es erstellt?
  p.created_at,
  p.scheduled_payment_date,
  NOW() as current_time
FROM payments p
JOIN appointments a ON p.appointment_id = a.id
WHERE p.id = '27c0bd33-56e8-49bf-8b7b-829c069a1fc1';
