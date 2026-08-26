-- Track the one automatic 3-day reminder for pending staff invitations.
ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_invitations_pending_reminder
  ON public.staff_invitations (created_at)
  WHERE status = 'pending' AND reminder_sent_at IS NULL;
