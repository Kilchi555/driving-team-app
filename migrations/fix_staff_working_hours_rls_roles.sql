-- Fix RLS policy roles for staff_working_hours table
-- Issue: Policies were using 'public' role instead of 'authenticated'
-- public role = EVERYONE (including unauthenticated)
-- authenticated role = only logged-in users

-- Drop the incorrect policies with 'public' role
DROP POLICY IF EXISTS "Admins can view all working hours" ON public.staff_working_hours;
DROP POLICY IF EXISTS "Staff can manage their own working hours" ON public.staff_working_hours;

-- Recreate with correct 'authenticated' role

-- 1. Admins can view all working hours
CREATE POLICY "Admins can view all working hours"
  ON public.staff_working_hours
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 2. Staff can manage their own working hours
CREATE POLICY "Staff can manage their own working hours"
  ON public.staff_working_hours
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = staff_working_hours.staff_id
      AND users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = staff_working_hours.staff_id
      AND users.auth_user_id = auth.uid()
    )
  );

-- Verify policies are updated
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS policy roles for staff_working_hours - changed public to authenticated';
END $$;
