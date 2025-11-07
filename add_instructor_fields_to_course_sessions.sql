-- 1. Fügt staff_id Spalte hinzu
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id);

-- 2. Fügt Instruktor-Felder hinzu
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS instructor_type VARCHAR(20) CHECK (instructor_type IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS external_instructor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_phone VARCHAR(50);

-- 3. Aktualisiert bestehende Sessions
UPDATE course_sessions 
SET instructor_type = 'internal' 
WHERE staff_id IS NOT NULL AND instructor_type IS NULL;