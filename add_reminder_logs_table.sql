-- Create reminder_logs table for tracking sent reminders
CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  payment_id UUID REFERENCES payments(id),
  appointment_id UUID REFERENCES appointments(id),
  user_id UUID REFERENCES users(id),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'simulated')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_reminder_logs_tenant_id ON reminder_logs(tenant_id);
CREATE INDEX idx_reminder_logs_payment_id ON reminder_logs(payment_id);
CREATE INDEX idx_reminder_logs_appointment_id ON reminder_logs(appointment_id);
CREATE INDEX idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX idx_reminder_logs_status ON reminder_logs(status);

-- Add RLS policies
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own tenant's logs
CREATE POLICY "Enable select for authenticated users" ON reminder_logs
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert logs
CREATE POLICY "Enable insert for authenticated users" ON reminder_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add columns to payments table for reminder tracking
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reminder_stage VARCHAR(20) CHECK (last_reminder_stage IN ('first', 'second', 'final'));

-- Add index for reminder tracking
CREATE INDEX IF NOT EXISTS idx_payments_last_reminder_sent_at ON payments(last_reminder_sent_at);
CREATE INDEX IF NOT EXISTS idx_payments_last_reminder_stage ON payments(last_reminder_stage);

