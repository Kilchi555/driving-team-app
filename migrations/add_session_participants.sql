-- Migration: Add current_participants to course_sessions
-- This allows tracking participants per SESSION (needed for session swapping)

-- Add columns to course_sessions
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0;

ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

COMMENT ON COLUMN course_sessions.current_participants IS 'Number of participants enrolled in this specific session';
COMMENT ON COLUMN course_sessions.max_participants IS 'Max participants for this session (overrides course max if set)';

-- Initialize session participants from course data
-- For each session, count confirmed registrations
-- Note: This is a one-time migration, after this the webhook will update per-session

-- Create function to recalculate session participants
CREATE OR REPLACE FUNCTION recalculate_session_participants(p_session_id UUID)
RETURNS void AS $$
DECLARE
  v_course_id UUID;
  v_count INTEGER;
BEGIN
  -- Get course_id for this session
  SELECT course_id INTO v_course_id 
  FROM course_sessions 
  WHERE id = p_session_id;
  
  -- Count confirmed registrations for this course
  -- TODO: When we have per-session registration tracking, update this query
  SELECT COUNT(*) INTO v_count
  FROM course_registrations
  WHERE course_id = v_course_id
    AND status = 'confirmed';
  
  -- Update session
  UPDATE course_sessions
  SET current_participants = v_count
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Initialize all sessions with their course's current_participants
UPDATE course_sessions cs
SET current_participants = c.current_participants,
    max_participants = c.max_participants
FROM courses c
WHERE cs.course_id = c.id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_course_sessions_participants 
ON course_sessions(course_id, current_participants);

