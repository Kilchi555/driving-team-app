-- Setze scheduled_payment_date auf JETZT für Test
UPDATE payments 
SET scheduled_payment_date = NOW() 
WHERE id = 'c74f1132-fee3-4f23-b7fa-45475dfc608f';

-- Prüfe das Ergebnis
SELECT 
  id,
  payment_status,
  scheduled_payment_date,
  automatic_payment_processed,
  wallee_transaction_id
FROM payments 
WHERE id = 'c74f1132-fee3-4f23-b7fa-45475dfc608f';

