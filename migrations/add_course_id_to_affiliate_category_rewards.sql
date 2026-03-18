-- Add course_id to affiliate_category_rewards for per-course reward definitions
-- Priority: course_id > driving_category > global tenant setting

-- Add optional course_id column
ALTER TABLE affiliate_category_rewards
ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

-- Make driving_category optional when course_id is set
ALTER TABLE affiliate_category_rewards
ALTER COLUMN driving_category DROP NOT NULL;

-- Ensure at most one active reward per course per tenant (partial unique index)
CREATE UNIQUE INDEX affiliate_category_rewards_course_unique
ON affiliate_category_rewards (tenant_id, course_id)
WHERE course_id IS NOT NULL;

-- Ensure driving_category or course_id is always set (not both null)
ALTER TABLE affiliate_category_rewards
ADD CONSTRAINT affiliate_category_rewards_requires_category_or_course
CHECK (driving_category IS NOT NULL OR course_id IS NOT NULL);
