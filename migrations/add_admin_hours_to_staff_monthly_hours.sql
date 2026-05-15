-- Add admin_hours column to staff_monthly_hours
-- Tracks time spent on administrative tasks (meetings, planning, paperwork)
-- that are not booked as appointments but count as actual working hours.

ALTER TABLE public.staff_monthly_hours
  ADD COLUMN admin_hours numeric(8, 2) NOT NULL DEFAULT 0;

-- Recreate the generated overtime_hours to include admin_hours
ALTER TABLE public.staff_monthly_hours
  DROP COLUMN overtime_hours;

ALTER TABLE public.staff_monthly_hours
  ADD COLUMN overtime_hours numeric(8, 2)
    GENERATED ALWAYS AS ((actual_hours + vacation_hours + sick_hours + admin_hours) - target_hours) STORED;
