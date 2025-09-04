-- Fix appointment staff_ids: All appointments should have Pascal's ID as staff_id
-- Pascal (091afa9b-e8a1-43b8-9cae-3195621619ae) is the staff member who should lead all lessons

-- Update the three appointments that currently have the admin's ID as staff_id
UPDATE appointments 
SET staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae'
WHERE id IN (
  '0812f10b-8777-4e7c-b47a-6041106634b4',
  'f3645e96-ce9b-4b96-bf23-5bdc4f136923',
  'ec526854-2832-4158-a0d0-07909c881210'
);

-- Verify the changes
SELECT 
  id,
  title,
  staff_id,
  user_id,
  start_time,
  status
FROM appointments 
WHERE id IN (
  '4e81188d-ff0a-467f-953e-cb4d54474516',
  '0812f10b-8777-4e7c-b47a-6041106634b4',
  'f3645e96-ce9b-4b96-bf23-5bdc4f136923',
  'ec526854-2832-4158-a0d0-07909c881210'
)
ORDER BY start_time;

-- Check if there are any other appointments with incorrect staff_id
SELECT 
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN staff_id = '091afa9b-e8a1-43b8-9cae-3195621619ae' THEN 1 END) as pascal_appointments,
  COUNT(CASE WHEN staff_id = '466c3c5a-1359-482a-b0b6-d82975f30b8b' THEN 1 END) as admin_appointments
FROM appointments 
WHERE deleted_at IS NULL;
