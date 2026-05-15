-- Add sick_hours column to staff_monthly_hours
-- sick_hours counts toward work time (like vacation) → overtime_hours is recalculated

ALTER TABLE public.staff_monthly_hours
  ADD COLUMN sick_hours numeric(8, 2) NOT NULL DEFAULT 0;

-- Recreate the generated overtime_hours to include sick_hours
ALTER TABLE public.staff_monthly_hours
  DROP COLUMN overtime_hours;

ALTER TABLE public.staff_monthly_hours
  ADD COLUMN overtime_hours numeric(8, 2)
    GENERATED ALWAYS AS ((actual_hours + vacation_hours + sick_hours) - target_hours) STORED;
