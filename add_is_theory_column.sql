-- Add is_theory column to evaluation_categories table
-- This allows marking evaluation categories as theory-specific

-- 1. Add is_theory column to evaluation_categories table
ALTER TABLE evaluation_categories 
ADD COLUMN IF NOT EXISTS is_theory BOOLEAN DEFAULT false;

-- 2. Create index for better performance when filtering theory categories
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_is_theory 
ON evaluation_categories(is_theory);

-- 3. Update existing "Theorie" categories to mark them as theory categories
UPDATE evaluation_categories 
SET is_theory = true 
WHERE name = 'Theorie' 
AND is_theory = false;

-- 4. Verify the changes
SELECT 
  '✅ is_theory column added to evaluation_categories' as status,
  COUNT(*) as total_categories,
  COUNT(*) FILTER (WHERE is_theory = true) as theory_categories,
  COUNT(*) FILTER (WHERE is_theory = false) as regular_categories
FROM evaluation_categories;
