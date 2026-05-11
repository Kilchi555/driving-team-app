-- Add first_lesson_only flag to discounts table
-- When true, the discount is only valid for customers who have never had a confirmed/paid appointment
ALTER TABLE discounts
  ADD COLUMN IF NOT EXISTS first_lesson_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN discounts.first_lesson_only IS 'When true, this discount can only be applied by customers who have no prior paid appointments (first-lesson check).';
