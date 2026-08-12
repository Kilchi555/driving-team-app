-- Track appointment confirmation email delivery for durable retries.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_status text;

COMMENT ON COLUMN public.appointments.confirmation_email_sent_at IS
  'When customer confirmation email was successfully sent (or skipped as terminal)';
COMMENT ON COLUMN public.appointments.confirmation_email_status IS
  'sent | queued | skipped | failed';

CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_retry
  ON public.appointments (created_at)
  WHERE confirmation_email_sent_at IS NULL
    AND coalesce(confirmation_email_status, '') NOT IN ('sent', 'skipped', 'queued')
    AND coalesce(status, '') IS DISTINCT FROM 'cancelled';
