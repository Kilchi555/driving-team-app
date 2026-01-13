-- Check SARI courses
SELECT 
  id,
  name,
  sari_managed,
  sari_course_id,
  category,
  external_instructor_name,
  created_at
FROM public.courses 
WHERE sari_managed = true
ORDER BY created_at DESC
LIMIT 5;
