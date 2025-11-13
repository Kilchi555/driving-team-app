-- Prüfe die spezifische Zahlung
SELECT 
  id,
  payment_status,
  scheduled_payment_date,
  automatic_payment_processed,
  automatic_payment_processed_at,
  created_at,
  updated_at,
  NOW() as current_time,
  (scheduled_payment_date <= NOW()) as should_be_processed
FROM payments
WHERE id = 'd0933df0-552a-432e-9c98-b22e2e4c7d42';

-- Prüfe alle ausstehenden Zahlungen
SELECT 
  id,
  payment_status,
  scheduled_payment_date,
  automatic_payment_processed,
  automatic_payment_consent,
  (scheduled_payment_date <= NOW()) as should_be_processed
FROM payments
WHERE payment_status = 'authorized'
  AND automatic_payment_consent = true
  AND automatic_payment_processed = false
  AND scheduled_payment_date IS NOT NULL
ORDER BY scheduled_payment_date;
