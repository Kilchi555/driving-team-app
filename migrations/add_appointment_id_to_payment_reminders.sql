-- Add appointment_id column if it doesn't exist
ALTER TABLE payment_reminders
ADD COLUMN IF NOT EXISTS appointment_id UUID;

-- Add FK constraint (without IF NOT EXISTS - Postgres doesn't support it for constraints)
ALTER TABLE payment_reminders
ADD CONSTRAINT fk_payment_reminders_appointment_id
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

