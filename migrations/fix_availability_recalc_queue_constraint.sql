-- Fix availability_recalc_queue unique constraint
-- The constraint should only be on (staff_id, tenant_id) not including processed status

-- Drop the old constraint
ALTER TABLE availability_recalc_queue
DROP CONSTRAINT IF EXISTS availability_recalc_queue_staff_id_tenant_id_processed_key;

-- Add the new constraint (only 2 columns)
ALTER TABLE availability_recalc_queue
ADD CONSTRAINT availability_recalc_queue_staff_id_tenant_id_key UNIQUE(staff_id, tenant_id);

-- Update the CHECK constraint to include new trigger values
ALTER TABLE availability_recalc_queue
DROP CONSTRAINT IF EXISTS availability_recalc_queue_trigger_check;

ALTER TABLE availability_recalc_queue
ADD CONSTRAINT availability_recalc_queue_trigger_check 
CHECK (trigger IN ('working_hours', 'external_event', 'appointment', 'appointment_edit', 'appointment_cancelled'));
