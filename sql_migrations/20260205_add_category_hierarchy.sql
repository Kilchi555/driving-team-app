-- Add parent_category_id column to categories table for hierarchy support
-- Enables grouping categories into main categories and subcategories

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_category_id bigint REFERENCES public.categories(id) ON DELETE CASCADE;

-- Add index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_category_id);

-- Add comment
COMMENT ON COLUMN public.categories.parent_category_id IS 'Foreign key to parent category. NULL for main categories, set for subcategories.';
