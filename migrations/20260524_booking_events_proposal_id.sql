-- Link inquiry_submitted booking_events to booking_proposals
ALTER TABLE public.booking_events
  ADD COLUMN IF NOT EXISTS proposal_id uuid;

CREATE INDEX IF NOT EXISTS booking_events_proposal_id_idx
  ON public.booking_events (proposal_id)
  WHERE proposal_id IS NOT NULL;
