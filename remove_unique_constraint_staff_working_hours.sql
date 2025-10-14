-- Remove unique constraint from staff_working_hours table
-- This allows multiple entries per day (e.g., working hours + non-working hours)

-- First, find the constraint name
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conrelid = 'staff_working_hours'::regclass 
-- AND contype = 'u';

-- Drop the unique constraint (replace 'staff_working_hours_tenant_staff_day_key' with actual constraint name)
ALTER TABLE staff_working_hours 
DROP CONSTRAINT IF EXISTS staff_working_hours_tenant_staff_day_key;

-- Alternative: If the constraint name is different, you can find it with:
-- \d staff_working_hours
-- in psql, or check the Supabase dashboard under Table Editor > staff_working_hours > Constraints
