-- Add 'inquiry_submitted' to booking_events event_type constraint
-- Previously the constraint only allowed: viewed, started, completed, abandoned
-- booking proposals submitted via BookingProposalForm were silently rejected
ALTER TABLE booking_events DROP CONSTRAINT IF EXISTS booking_events_event_type_check;
ALTER TABLE booking_events ADD CONSTRAINT booking_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'viewed'::text,
    'started'::text,
    'completed'::text,
    'abandoned'::text,
    'inquiry_submitted'::text
  ]));
