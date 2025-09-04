-- Fix missing RLS policies for categories table
-- Currently only SELECT policies exist, but INSERT/UPDATE/DELETE policies are missing

-- 1. Enable RLS on categories table (if not already enabled)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Add INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to insert categories" ON public.categories
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- 3. Add UPDATE policy for authenticated users
CREATE POLICY "Allow authenticated users to update categories" ON public.categories
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- 4. Add DELETE policy for authenticated users
CREATE POLICY "Allow authenticated users to delete categories" ON public.categories
    FOR DELETE 
    TO authenticated 
    USING (true);

-- 5. Verify all policies exist
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'categories'
ORDER BY cmd;

-- 6. Test the update that was failing
UPDATE categories 
SET lesson_duration_minutes = ARRAY[45, 90] 
WHERE id = 23;

-- 7. Verify the update worked
SELECT id, name, lesson_duration_minutes FROM categories WHERE id = 23;
