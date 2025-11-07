-- ========================================
-- SIMPLE STORAGE BUCKET FIX
-- ========================================

-- Step 1: Check if user-documents bucket exists
SELECT 
    'Current buckets:' as info,
    name, id, public, file_size_limit
FROM storage.buckets 
ORDER BY name;

-- Step 2: Make user-documents bucket public (this is the key!)
UPDATE storage.buckets 
SET public = true 
WHERE name = 'user-documents';

-- Step 3: Verify the bucket is now public
SELECT 
    'Bucket status after update:' as info,
    name, 
    public,
    CASE 
        WHEN public THEN '✅ PUBLIC - Images should load'
        ELSE '❌ PRIVATE - Images will not load'
    END as status
FROM storage.buckets 
WHERE name = 'user-documents';

-- Step 4: Test the specific file path
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Storage bucket made public!';
    RAISE NOTICE '';
    RAISE NOTICE 'Test this URL in browser now:';
    RAISE NOTICE 'https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/user-documents/lernfahrausweise/9cca023a-ab9d-4df1-ae9d-488bae2b8e15_lernfahrausweis_front_1758451801550.jpg';
    RAISE NOTICE '';
    RAISE NOTICE 'If it shows the image, the frontend will work too!';
    RAISE NOTICE '';
END $$;




















