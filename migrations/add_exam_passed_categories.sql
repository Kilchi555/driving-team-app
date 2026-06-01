-- Add exam_passed_categories column to users table
-- Tracks which driving categories a student has passed their exam for
-- e.g. ['B', 'A'] means they passed both category B and A exams
ALTER TABLE users
ADD COLUMN IF NOT EXISTS exam_passed_categories TEXT[] DEFAULT '{}';

-- Index for filtering students who have passed specific categories
CREATE INDEX IF NOT EXISTS idx_users_exam_passed_categories
  ON users USING GIN (exam_passed_categories);

COMMENT ON COLUMN users.exam_passed_categories IS
  'Array of driving category codes (e.g. B, A, BE) for which the student has passed the practical exam.';
