-- Add appointment_id column if it doesn't exist
ALTER TABLE payment_reminders
ADD COLUMN IF NOT EXISTS appointment_id UUID;

-- Add FK constraint
ALTER TABLE payment_reminders
ADD CONSTRAINT IF NOT EXISTS fk_payment_reminders_appointment_id
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
