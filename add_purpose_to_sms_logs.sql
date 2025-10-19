-- Add purpose field to sms_logs table to track different SMS types

ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add comment
COMMENT ON COLUMN sms_logs.purpose IS 'Purpose of SMS: student_onboarding, payment_reminder, appointment_reminder, etc.';

-- Create index for filtering by purpose
CREATE INDEX IF NOT EXISTS idx_sms_logs_purpose ON sms_logs(purpose);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sms_logs'
AND column_name = 'purpose';

