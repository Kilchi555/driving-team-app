-- Set these payments to completed status
UPDATE payments
SET 
  payment_status = 'completed',
  paid_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  '8b8fa6ff-cc60-476a-a881-c4f129e45d97',
  '206e8e9f-02ab-4279-af1f-1a25325f10f5'
);

-- Verify the update
SELECT 
  id,
  appointment_id,
  payment_status,
  payment_method,
  total_amount_rappen / 100.0 as total_chf,
  wallee_transaction_id,
  paid_at,
  created_at
FROM payments
WHERE id IN (
  '8b8fa6ff-cc60-476a-a881-c4f129e45d97',
  '206e8e9f-02ab-4279-af1f-1a25325f10f5'
)
ORDER BY created_at DESC;

-- Also update the appointments to 'confirmed' status
UPDATE appointments
SET 
  status = 'confirmed',
  updated_at = NOW()
WHERE id IN (
  SELECT appointment_id 
  FROM payments 
  WHERE id IN (
    '8b8fa6ff-cc60-476a-a881-c4f129e45d97',
    '206e8e9f-02ab-4279-af1f-1a25325f10f5'
  )
);

-- Verify appointment updates
SELECT 
  a.id as appointment_id,
  a.start_time,
  a.title,
  a.status as appointment_status,
  p.id as payment_id,
  p.payment_status,
  p.paid_at
FROM appointments a
JOIN payments p ON p.appointment_id = a.id
WHERE p.id IN (
  '8b8fa6ff-cc60-476a-a881-c4f129e45d97',
  '206e8e9f-02ab-4279-af1f-1a25325f10f5'
);
