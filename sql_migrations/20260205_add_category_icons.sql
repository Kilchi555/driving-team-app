-- Add icon_svg column to categories table for custom SVG icons
-- Allows storing custom SVG code for each category

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS icon_svg TEXT;

-- Add comment
COMMENT ON COLUMN public.categories.icon_svg IS 'Custom SVG icon code for this category. Stored as full SVG markup.';

-- Create index for potential future queries
CREATE INDEX IF NOT EXISTS idx_categories_has_icon ON public.categories(icon_svg IS NOT NULL);
