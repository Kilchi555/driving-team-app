-- Create payment_reminders table to track all reminder attempts
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reminder details
  reminder_type VARCHAR(50) NOT NULL DEFAULT 'urgent', -- urgent, overdue, etc.
  channel VARCHAR(50) NOT NULL DEFAULT 'email', -- email, sms, both
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  
  -- Communication details
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  resend_email_id VARCHAR(255), -- Track Resend email ID for correlation
  
  -- Appointment and payment info at time of send
  appointment_start_time TIMESTAMP WITH TIME ZONE,
  payment_amount_rappen BIGINT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),
  
  -- Metadata
  attempt_number INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_id 
ON payment_reminders(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_user_id 
ON payment_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_status 
ON payment_reminders(status);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_created_at 
ON payment_reminders(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_appointment_id 
ON payment_reminders(appointment_id);

-- Index for finding unsent reminders
CREATE INDEX IF NOT EXISTS idx_payment_reminders_pending 
ON payment_reminders(status, created_at) 
WHERE status IN ('pending', 'failed');

-- Enable RLS
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own reminders
CREATE POLICY "Users can view their own payment reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Staff/Admins can view all reminders for their tenant
CREATE POLICY "Staff can view tenant payment reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Service role can insert/update
CREATE POLICY "Service role can manage payment reminders"
  ON payment_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
