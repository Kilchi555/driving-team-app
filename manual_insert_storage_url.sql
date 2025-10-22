-- ========================================
-- MANUAL INSERT STORAGE URL FOR HANS MEIER
-- ========================================

-- Step 1: Show current Hans Meier data
SELECT 
    'Before update:' as status,
    id, first_name, last_name, lernfahrausweis_url
FROM users 
WHERE id = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';

-- Step 2: Manually insert the storage URL we know exists
UPDATE users 
SET lernfahrausweis_url = 'https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/user-documents/lernfahrausweise/9cca023a-ab9d-4df1-ae9d-488bae2b8e15_lernfahrausweis_front_1758451801550.jpg'
WHERE id = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';

-- Step 3: Verify the update worked
SELECT 
    'After update:' as status,
    id, first_name, last_name, 
    CASE 
        WHEN lernfahrausweis_url IS NOT NULL THEN 'URL SET ✅'
        ELSE 'STILL NULL ❌'
    END as url_status,
    lernfahrausweis_url
FROM users 
WHERE id = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';

-- Step 4: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage URL manually inserted for Hans Meier!';
    RAISE NOTICE '';
    RAISE NOTICE 'Now test the frontend:';
    RAISE NOTICE '1. Close and reopen Hans Meier modal';
    RAISE NOTICE '2. Go to Documents tab';
    RAISE NOTICE '3. You should see the gallery with thumbnail!';
    RAISE NOTICE '';
END $$;
















