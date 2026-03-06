-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_availability_slot_update ON availability_slots;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION validate_availability_slot_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.id != OLD.id OR
    NEW.tenant_id != OLD.tenant_id OR
    NEW.staff_id != OLD.staff_id OR
    NEW.location_id != OLD.location_id OR
    NEW.start_time != OLD.start_time OR
    NEW.end_time != OLD.end_time OR
    NEW.duration_minutes != OLD.duration_minutes OR
    NEW.is_available != OLD.is_available OR
    NEW.booking_type != OLD.booking_type OR
    NEW.slot_type != OLD.slot_type OR
    NEW.calculated_at != OLD.calculated_at OR
    NEW.appointment_id != OLD.appointment_id OR
    NEW.created_at != OLD.created_at OR
    NEW.category_code != OLD.category_code
  ) THEN
    RAISE EXCEPTION 'Only reserved_by_session and reserved_until can be modified';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger without WHEN clause
CREATE TRIGGER trigger_validate_availability_slot_update
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION validate_availability_slot_update();