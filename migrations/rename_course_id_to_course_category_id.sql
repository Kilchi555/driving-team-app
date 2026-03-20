/**
 * Migration: Remove course_id from affiliate_category_rewards
 * 
 * Rationale:
 * The affiliate_category_rewards table uses driving_category (TEXT codes like "VKU", "PGS")
 * to match with courses.category. The course_id column was never properly populated and is not needed.
 * All rewards are category-based, not course-specific.
 * 
 * Changes:
 * 1. Drop the Foreign Key constraint on course_id
 * 2. Drop the partial index on course_id
 * 3. Drop the course_id column entirely
 * 4. Update CHECK constraint to only require driving_category
 */

-- Step 1: Drop the old Foreign Key constraint
ALTER TABLE affiliate_category_rewards 
DROP CONSTRAINT affiliate_category_rewards_course_id_fkey;

-- Step 2: Drop the old partial index
DROP INDEX IF EXISTS affiliate_category_rewards_course_unique;

-- Step 3: Drop the course_id column
ALTER TABLE affiliate_category_rewards 
DROP COLUMN course_id;

-- Step 4: Update the CHECK constraint to only require driving_category
ALTER TABLE affiliate_category_rewards 
DROP CONSTRAINT affiliate_category_rewards_requires_category_or_course;

ALTER TABLE affiliate_category_rewards 
ADD CONSTRAINT affiliate_category_rewards_requires_driving_category 
CHECK (driving_category IS NOT NULL);
