ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('online', 'manual'));

UPDATE appointments a
SET source = 'online'
FROM payments p
WHERE p.appointment_id = a.id
  AND p.created_by = a.user_id
  AND p.payment_method = 'wallee';
