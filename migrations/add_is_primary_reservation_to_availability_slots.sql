ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS is_primary_reservation BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Add an index if this column will be frequently queried
CREATE INDEX IF NOT EXISTS idx_availability_primary_reservation ON public.availability_slots (is_primary_reservation);

COMMENT ON COLUMN public.availability_slots.is_primary_reservation IS 'Indicates if this slot was the one initially clicked/reserved by the user (TRUE) or an automatically reserved overlapping slot (FALSE).';

-- Set existing reserved slots to is_primary_reservation = TRUE if their appointment_id is set
-- This is a migration step for existing data to ensure old primary reservations are marked
UPDATE public.availability_slots
SET is_primary_reservation = TRUE
WHERE reserved_by_session IS NOT NULL
  AND reserved_until > NOW();

-- Also for slots linked to a confirmed appointment
UPDATE public.availability_slots
SET is_primary_reservation = TRUE
WHERE appointment_id IS NOT NULL;
