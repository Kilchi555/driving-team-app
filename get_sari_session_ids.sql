-- Get SARI session IDs from synced courses
SELECT 
  c.name as course_name,
  cs.title as session_title,
  cs.sari_session_id,
  cs.start_time
FROM public.course_sessions cs
JOIN public.courses c ON c.id = cs.course_id
WHERE cs.sari_session_id IS NOT NULL
ORDER BY cs.start_time
LIMIT 5;
