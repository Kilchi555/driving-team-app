-- ========================================
-- ADD FLEXIBLE DOCUMENTS JSON COLUMN
-- ========================================

-- Step 1: Add documents column to users table
ALTER TABLE users 
ADD COLUMN documents JSONB DEFAULT '{}';

-- Step 2: Migrate existing lernfahrausweis data to JSON format
UPDATE users 
SET documents = jsonb_build_object(
  'lernfahrausweis', jsonb_build_object(
    'front', lernfahrausweis_url,
    'back', lernfahrausweis_back_url
  )
)
WHERE lernfahrausweis_url IS NOT NULL 
   OR lernfahrausweis_back_url IS NOT NULL;

-- Step 3: Create index for better performance
CREATE INDEX idx_users_documents ON users USING gin (documents);

-- Step 4: Test queries
-- Get lernfahrausweis front:
-- SELECT documents->'lernfahrausweis'->>'front' as lernfahrausweis_url FROM users WHERE id = 'user_id';

-- Get fuehrerschein back:
-- SELECT documents->'fuehrerschein'->>'back' as fuehrerschein_back_url FROM users WHERE id = 'user_id';

-- Step 5: Show sample data structure
DO $$
BEGIN
    RAISE NOTICE '✅ Documents JSON column added successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Example JSON structure:';
    RAISE NOTICE '{';
    RAISE NOTICE '  "lernfahrausweis": {';
    RAISE NOTICE '    "front": "https://storage.url/file1.jpg",';
    RAISE NOTICE '    "back": "https://storage.url/file2.jpg"';
    RAISE NOTICE '  },';
    RAISE NOTICE '  "fuehrerschein": {';
    RAISE NOTICE '    "front": "https://storage.url/file3.jpg",';
    RAISE NOTICE '    "back": "https://storage.url/file4.jpg"';
    RAISE NOTICE '  }';
    RAISE NOTICE '}';
END $$;



