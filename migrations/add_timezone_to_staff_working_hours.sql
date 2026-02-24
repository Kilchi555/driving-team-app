-- Change staff_working_hours time columns from TIME to TIMETZ
-- This makes timezone explicit, consistent with how timestamps are stored throughout the app
-- Existing values are treated as UTC (which they already are)

ALTER TABLE staff_working_hours
  ALTER COLUMN start_time TYPE TIMETZ USING start_time::TIMETZ,
  ALTER COLUMN end_time TYPE TIMETZ USING end_time::TIMETZ;
