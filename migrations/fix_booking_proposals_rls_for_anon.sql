-- Fix RLS policy for booking_proposals to allow anon INSERT
-- The anon user needs explicit permission to insert new proposals

-- Drop existing INSERT policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS anon_insert_proposals ON booking_proposals;

-- Create a more permissive INSERT policy for anon users
-- Anon users should be able to insert proposals without restrictions
-- (validation happens at the API level)
CREATE POLICY anon_insert_booking_proposals ON booking_proposals
  FOR INSERT
  WITH CHECK (true);

-- Also add a SELECT policy for anon users to read their own proposals
DROP POLICY IF EXISTS anon_select_proposals ON booking_proposals;
CREATE POLICY anon_select_booking_proposals ON booking_proposals
  FOR SELECT
  USING (true); -- Allow reading all proposals (they're not sensitive, just proposals waiting for staff review)
