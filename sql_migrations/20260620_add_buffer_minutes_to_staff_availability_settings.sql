-- Add buffer_minutes and home_plz to staff_availability_settings
-- buffer_minutes: base buffer (prep time) the instructor wants after each appointment
-- home_plz: instructor's home ZIP, reserved for future "start/end of day" travel time calculations

ALTER TABLE staff_availability_settings
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS home_plz VARCHAR(10);

COMMENT ON COLUMN staff_availability_settings.buffer_minutes IS
  'Basis-Pufferzeit in Minuten nach einem Termin (für Notizen, Übergabe etc.). '
  'Fahrzeit zwischen Standorten wird automatisch berechnet und dazu addiert.';

COMMENT ON COLUMN staff_availability_settings.home_plz IS
  'Heimadresse PLZ des Fahrlehrers – für zukünftige Fahrzeit-Berechnung ab/bis Zuhause.';

-- Backfill: ensure every existing staff member has a row with the default
INSERT INTO staff_availability_settings (staff_id, buffer_minutes)
SELECT u.id, 15
FROM users u
WHERE u.role = 'staff'
  AND NOT EXISTS (
    SELECT 1 FROM staff_availability_settings s WHERE s.staff_id = u.id
  );
