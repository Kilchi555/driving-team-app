-- Add status field to courses table with new status system
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
CHECK (status IN ('draft', 'active', 'full', 'running', 'completed', 'cancelled'));

-- Update existing courses to have appropriate status
UPDATE courses 
SET status = CASE 
  WHEN is_active = false THEN 'cancelled'
  WHEN current_participants >= max_participants THEN 'full'
  WHEN EXISTS (
    SELECT 1 FROM course_sessions cs 
    WHERE cs.course_id = courses.id 
    AND cs.start_time <= NOW() 
    AND cs.end_time >= NOW()
  ) THEN 'running'
  WHEN EXISTS (
    SELECT 1 FROM course_sessions cs 
    WHERE cs.course_id = courses.id 
    AND cs.end_time < NOW()
    ORDER BY cs.end_time DESC 
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM course_sessions cs 
    WHERE cs.course_id = courses.id 
    AND cs.start_time > NOW()
  ) THEN 'completed'
  ELSE 'active'
END
WHERE status = 'draft';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Add status tracking fields
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id);
