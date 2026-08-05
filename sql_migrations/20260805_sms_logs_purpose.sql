-- Add purpose field to sms_logs for SMS type tracking (used by sendTenantSMS)
ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS purpose TEXT;

COMMENT ON COLUMN sms_logs.purpose IS 'Purpose of SMS: staff_invite, student_onboarding, appointment_confirmation, etc.';

CREATE INDEX IF NOT EXISTS idx_sms_logs_purpose ON sms_logs(purpose);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant_purpose_sent
  ON sms_logs (tenant_id, purpose, sent_at DESC)
  WHERE tenant_id IS NOT NULL;
