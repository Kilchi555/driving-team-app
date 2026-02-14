-- Migration: RLS policy for releasing slot reservations
-- Date: 2026-02-14
--
-- PURPOSE:
-- - Allow 'anon' role to release a reservation (set reserved_until and reserved_by_session to NULL)
--   ONLY if the session_id from the JWT matches the reserved_by_session value in the row.

DROP POLICY IF EXISTS "release_own_reservation" ON public.availability_slots;

CREATE POLICY "release_own_reservation" ON public.availability_slots
  FOR UPDATE
  TO anon
  USING (
    auth.jwt() ->> 'session_id' = reserved_by_session
  )
  WITH CHECK (
    auth.jwt() ->> 'session_id' = reserved_by_session
  );

-- Important: This policy only allows clearing the reservation for the *current* session.
-- It does NOT allow a session to clear another session's reservation.
-- Also, it does NOT allow setting new reservation values. The `reserve-slot.post.ts` API
-- handles setting new reservations with its own RLS policy (`update_available_slots`).

DO $$
BEGIN
  RAISE NOTICE 'RLS policy "release_own_reservation" for availability_slots created successfully.';
END $$;
