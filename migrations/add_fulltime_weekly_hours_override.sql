-- Per-staff override for the "100% workload = X hours/week" reference.
-- If NULL, the tenant-level fulltime_weekly_hours (from tenant_settings) is used.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fulltime_weekly_hours_override numeric(5, 2);
