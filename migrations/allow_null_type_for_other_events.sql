-- Migration: Allow NULL for appointments.type column
-- For "other" event types (meetings, training, VKU, Nothelfer, etc.)
-- these appointments don't have a driving category (type), so type should be NULL

-- ✅ Step 1: Make type column nullable
ALTER TABLE public.appointments
  ALTER COLUMN type DROP NOT NULL;

-- ✅ Step 2: Add a check constraint to ensure:
--    - If event_type_code IN ('lesson', 'exam', 'practice'), type must NOT be NULL
--    - If event_type_code IN ('other', 'course'), type CAN be NULL
-- Note: We use a flexible constraint that allows future expansion
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_type_required_for_lessons
  CHECK (
    (event_type_code IN ('lesson', 'exam', 'practice') AND type IS NOT NULL)
    OR
    (event_type_code NOT IN ('lesson', 'exam', 'practice') OR event_type_code IS NULL)
  );

-- ✅ Step 3: Add helpful comment
COMMENT ON COLUMN public.appointments.type IS 
  'Driving category (A, B, C, etc.). NULL for non-lesson events like meetings, training, VKU, Nothelfer.';

-- ✅ Optional: Update existing appointments if needed
-- If you have existing appointments with type='other' or similar, update them to NULL:
-- UPDATE public.appointments 
-- SET type = NULL 
-- WHERE event_type_code IN ('other', 'course', 'meeting', 'training')
--   AND type NOT IN ('A', 'A1', 'A2', 'B', 'BE', 'B96', 'C', 'C1', 'CE', 'C1E', 'D', 'D1', 'DE', 'D1E', 'F', 'G', 'M', 'B Schaltung', 'BPT', 'C1/D1', 'Boot', 'Motorboot');

