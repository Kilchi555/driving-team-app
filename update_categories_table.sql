-- Update categories table to use arrays for lesson_duration_minutes
-- This makes the categories table the central source for all category information

-- 1. Add the lesson_duration_minutes column as integer[] array
ALTER TABLE public.categories 
ADD COLUMN lesson_duration_minutes integer[] DEFAULT '{45}';

-- 2. Update existing categories with predefined lesson duration arrays
UPDATE public.categories 
SET lesson_duration_minutes = CASE 
  WHEN code = 'B' THEN ARRAY[45, 60, 90, 120, 180]           -- Personenwagen: Standard + längere Lektionen
  WHEN code = 'A' THEN ARRAY[45, 60, 90]                      -- Motorrad: Standard + mittlere Lektionen
  WHEN code = 'BE' THEN ARRAY[45, 60, 90, 120, 180]           -- Personenwagen mit Anhänger: Standard + längere
  WHEN code = 'BPT' THEN ARRAY[45, 60, 90, 120, 180]          -- Beruflicher Personentransport: Standard + längere
  WHEN code = 'C1D1' THEN ARRAY[45, 60, 90, 120, 180, 240]   -- Bis 7.5t / 16 Personen: Standard + sehr lange
  WHEN code = 'C' THEN ARRAY[45, 60, 90, 120, 180, 240]      -- Lastwagen: Standard + sehr lange
  WHEN code = 'CE' THEN ARRAY[45, 60, 90, 120, 180, 240]     -- Lastwagen mit Anhänger: Standard + sehr lange
  WHEN code = 'D' THEN ARRAY[45, 60, 90, 120, 180, 240, 300] -- Bus: Standard + sehr lange + extra lange
  WHEN code = 'Motorboot' THEN ARRAY[45, 60, 90, 120, 180]   -- Motorboot: Standard + längere
  ELSE ARRAY[45, 60, 90]                                       -- Standard für alle anderen Kategorien
END;

-- 3. Set a default value for any remaining NULL values
UPDATE public.categories 
SET lesson_duration_minutes = ARRAY[45, 60, 90] 
WHERE lesson_duration_minutes IS NULL;

-- 4. Make the column NOT NULL after setting all values
ALTER TABLE public.categories 
ALTER COLUMN lesson_duration_minutes SET NOT NULL;

-- 5. Optional: Add a comment to document the new structure
COMMENT ON COLUMN public.categories.lesson_duration_minutes IS 'Array of available lesson durations in minutes for this category. First value is the default duration.';

-- 6. Verify the changes
SELECT 
  code,
  name,
  lesson_duration_minutes,
  exam_duration_minutes
FROM public.categories 
ORDER BY code;

-- 7. Optional: Create a function to get the default lesson duration (first value in array)
CREATE OR REPLACE FUNCTION get_default_lesson_duration(category_code varchar)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT lesson_duration_minutes[1] 
    FROM public.categories 
    WHERE code = category_code
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Optional: Create a function to get all available lesson durations for a category
CREATE OR REPLACE FUNCTION get_available_lesson_durations(category_code varchar)
RETURNS integer[] AS $$
BEGIN
  RETURN (
    SELECT lesson_duration_minutes 
    FROM public.categories 
    WHERE code = category_code
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Test the functions
SELECT 
  'B' as category_code,
  get_default_lesson_duration('B') as default_duration,
  get_available_lesson_durations('B') as all_durations;

SELECT 
  'D' as category_code,
  get_default_lesson_duration('D') as default_duration,
  get_available_lesson_durations('D') as all_durations;
