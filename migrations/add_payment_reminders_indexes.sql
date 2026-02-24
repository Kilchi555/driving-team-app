-- Create indexes for performance
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

CREATE INDEX IF NOT EXISTS idx_payment_reminders_tenant_id 
ON payment_reminders(tenant_id);
