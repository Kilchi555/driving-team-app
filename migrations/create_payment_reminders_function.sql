-- ============================================
-- Get Payments Due for Reminders
-- ============================================
-- Returns only payments where appointment is 23-25 hours away
-- Filters: pending status, valid payment methods, not already sent in last 24h

CREATE OR REPLACE FUNCTION get_payments_due_for_reminders()
RETURNS TABLE (
  payment_id UUID,
  user_id UUID,
  tenant_id UUID,
  appointment_id UUID,
  appointment_start_time TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR,
  payment_status VARCHAR,
  total_amount_rappen BIGINT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.tenant_id,
    a.id,
    a.start_time,
    p.payment_method,
    p.payment_status,
    p.total_amount_rappen,
    p.reminder_sent_at
  FROM payments p
  JOIN appointments a ON p.appointment_id = a.id
  WHERE 
    -- Only pending payments
    p.payment_status = 'pending'
    -- Only these payment methods
    AND p.payment_method IN ('wallee', 'cash', 'invoice')
    -- Appointment must be in 23-25 hour window (roughly "tomorrow")
    AND a.start_time >= (NOW() AT TIME ZONE 'UTC') + INTERVAL '23 hours'
    AND a.start_time < (NOW() AT TIME ZONE 'UTC') + INTERVAL '25 hours'
    -- Not already sent in the last 24 hours
    AND (p.reminder_sent_at IS NULL OR p.reminder_sent_at < (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours')
  ORDER BY a.start_time ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_status_method 
  ON payments(payment_status, payment_method);

CREATE INDEX IF NOT EXISTS idx_payments_appointment_id 
  ON payments(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time 
  ON appointments(start_time);

