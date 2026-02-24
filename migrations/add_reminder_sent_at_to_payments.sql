-- Add reminder_sent_at column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance (filtering by reminder_sent_at)
CREATE INDEX IF NOT EXISTS idx_payments_reminder_sent_at 
ON payments(reminder_sent_at);
