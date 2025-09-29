-- Add course duration and session structure to course_categories
-- This allows defining how courses are structured (e.g., 1x8h, 2x4h, 3x4h)

-- Add new columns for course duration and structure
ALTER TABLE course_categories 
ADD COLUMN IF NOT EXISTS total_duration_hours DECIMAL(4,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1 CHECK (session_count > 0),
ADD COLUMN IF NOT EXISTS hours_per_session DECIMAL(4,2) DEFAULT 8.0 CHECK (hours_per_session > 0),
ADD COLUMN IF NOT EXISTS session_structure JSONB DEFAULT '{"flexible": true}';

-- Add computed constraint to ensure total_duration = session_count * hours_per_session
ALTER TABLE course_categories 
ADD CONSTRAINT course_categories_duration_consistency 
CHECK (ABS(total_duration_hours - (session_count * hours_per_session)) < 0.1);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_course_categories_duration ON course_categories(total_duration_hours);
CREATE INDEX IF NOT EXISTS idx_course_categories_sessions ON course_categories(session_count);

-- Update existing categories with realistic durations
UPDATE course_categories SET
  total_duration_hours = CASE 
    WHEN code = 'VKU' THEN 8.0
    WHEN code = 'PGS' THEN 12.0
    WHEN code = 'CZV' THEN 35.0
    WHEN code = 'Fahrlehrer' THEN 14.0
    WHEN code = 'Privat' THEN 4.0
    ELSE 8.0
  END,
  session_count = CASE 
    WHEN code = 'VKU' THEN 2
    WHEN code = 'PGS' THEN 3
    WHEN code = 'CZV' THEN 5
    WHEN code = 'Fahrlehrer' THEN 2
    WHEN code = 'Privat' THEN 1
    ELSE 1
  END,
  hours_per_session = CASE 
    WHEN code = 'VKU' THEN 4.0
    WHEN code = 'PGS' THEN 4.0
    WHEN code = 'CZV' THEN 7.0
    WHEN code = 'Fahrlehrer' THEN 7.0
    WHEN code = 'Privat' THEN 4.0
    ELSE 8.0
  END,
  session_structure = CASE 
    WHEN code = 'VKU' THEN '{"days": ["Tuesday", "Thursday"], "flexible": false, "description": "2 Abende à 4 Stunden"}'::jsonb
    WHEN code = 'PGS' THEN '{"days": ["Friday", "Saturday", "Sunday"], "flexible": false, "description": "3 Tage à 4 Stunden"}'::jsonb
    WHEN code = 'CZV' THEN '{"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "flexible": true, "description": "5 Tage à 7 Stunden"}'::jsonb
    WHEN code = 'Fahrlehrer' THEN '{"days": ["Saturday", "Sunday"], "flexible": false, "description": "Wochenende à 7 Stunden"}'::jsonb
    WHEN code = 'Privat' THEN '{"flexible": true, "description": "Individuell planbar"}'::jsonb
    ELSE '{"flexible": true}'::jsonb
  END;

-- Create function to get course duration info
CREATE OR REPLACE FUNCTION get_course_duration_info(category_id UUID)
RETURNS TABLE (
  total_hours DECIMAL(4,2),
  session_count INTEGER,
  hours_per_session DECIMAL(4,2),
  structure_info JSONB,
  formatted_duration TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.total_duration_hours,
    cc.session_count,
    cc.hours_per_session,
    cc.session_structure,
    CASE 
      WHEN cc.session_count = 1 THEN 
        cc.total_duration_hours::TEXT || 'h (1 Termin)'
      ELSE 
        cc.session_count::TEXT || ' x ' || cc.hours_per_session::TEXT || 'h (' || cc.total_duration_hours::TEXT || 'h total)'
    END as formatted_duration
  FROM course_categories cc
  WHERE cc.id = category_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_course_duration_info(UUID) TO authenticated;

-- Verify the changes
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Course duration structure added successfully';
    RAISE NOTICE 'Updated categories with durations:';
    
    FOR rec IN 
        SELECT 
          code, 
          name,
          total_duration_hours,
          session_count,
          hours_per_session,
          session_structure->>'description' as structure_desc
        FROM course_categories 
        ORDER BY sort_order
    LOOP
        RAISE NOTICE '% (%): %h total = % x %h - %', 
          rec.code, 
          rec.name,
          rec.total_duration_hours,
          rec.session_count,
          rec.hours_per_session,
          rec.structure_desc;
    END LOOP;
    
    RAISE NOTICE 'Categories now have structured duration information';
    RAISE NOTICE 'Use get_course_duration_info(category_id) to get formatted duration';
END $$;
