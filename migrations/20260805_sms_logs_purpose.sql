-- Staff-invite / sendTenantSMS writes purpose on every sms_logs row.
-- Production was missing this column → inserts failed (SMS may still send,
-- but we lose delivery audit trail and debugging).

ALTER TABLE sms_logs
  ADD COLUMN IF NOT EXISTS purpose TEXT;

COMMENT ON COLUMN sms_logs.purpose IS
  'Purpose of SMS: staff_invite, student_onboarding, payment_reminder, appointment_reminder, etc.';

CREATE INDEX IF NOT EXISTS idx_sms_logs_purpose ON sms_logs (purpose);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant_purpose_sent
  ON sms_logs (tenant_id, purpose, sent_at DESC)
  WHERE tenant_id IS NOT NULL;
