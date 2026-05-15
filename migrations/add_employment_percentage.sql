-- Add employment_percentage to users table
-- This allows specifying a staff member's workload as a percentage of the
-- tenant's configured fulltime_weekly_hours.
-- weekly_contracted_hours stays as the derived value used in all calculations.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employment_percentage numeric(5, 2);
