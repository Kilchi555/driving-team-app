-- Update existing payments with scheduled_authorization_date
-- Für alle pending/authorized payments die bereits scheduled_payment_date haben

UPDATE payments
SET 
  scheduled_authorization_date = (
    -- Berechne Authorization Date: 168h (7 Tage) vor dem Termin
    SELECT (a.start_time::timestamp - INTERVAL '168 hours')
    FROM appointments a
    WHERE a.id = payments.appointment_id
  ),
  updated_at = NOW()
WHERE 
  payment_status IN ('pending', 'authorized')
  AND scheduled_payment_date IS NOT NULL
  AND scheduled_authorization_date IS NULL
  AND appointment_id IS NOT NULL;

-- Zeige aktualisierte Payments
SELECT 
  p.id,
  p.payment_status,
  p.total_amount_rappen / 100.0 as amount_chf,
  a.start_time as appointment_start,
  p.scheduled_authorization_date,
  p.scheduled_payment_date,
  u.first_name,
  u.last_name
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.payment_status IN ('pending', 'authorized')
  AND p.scheduled_authorization_date IS NOT NULL
ORDER BY a.start_time ASC;

