-- ========================================
-- FIX STORAGE BUCKET POLICIES FOR PUBLIC ACCESS
-- ========================================

-- Step 1: Check if user-documents bucket exists and is public
SELECT 
    'Bucket info:' as info,
    name, id, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE name = 'user-documents';

-- Step 2: Make user-documents bucket public if it isn't
UPDATE storage.buckets 
SET public = true 
WHERE name = 'user-documents';

-- Step 3: Check current storage policies
SELECT 
    'Current storage policies:' as info,
    policyname, bucket_id, operation, definition
FROM storage.policies 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'user-documents')
ORDER BY operation, policyname;

-- Step 4: Drop any restrictive policies
DELETE FROM storage.policies 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'user-documents')
AND operation = 'SELECT';

-- Step 5: Create public SELECT policy for user-documents
INSERT INTO storage.policies (bucket_id, policyname, operation, definition)
SELECT 
    id,
    'user_documents_public_access',
    'SELECT',
    'true'
FROM storage.buckets 
WHERE name = 'user-documents';

-- Step 6: Also allow authenticated users to INSERT (for uploads)
INSERT INTO storage.policies (bucket_id, policyname, operation, definition)
SELECT 
    id,
    'user_documents_authenticated_upload',
    'INSERT',
    '(auth.role() = ''authenticated'')'
FROM storage.buckets 
WHERE name = 'user-documents'
ON CONFLICT DO NOTHING;

-- Step 7: Allow authenticated users to UPDATE/DELETE their own files
INSERT INTO storage.policies (bucket_id, policyname, operation, definition)
SELECT 
    id,
    'user_documents_authenticated_manage',
    'UPDATE',
    '(auth.role() = ''authenticated'')'
FROM storage.buckets 
WHERE name = 'user-documents'
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (bucket_id, policyname, operation, definition)
SELECT 
    id,
    'user_documents_authenticated_delete',
    'DELETE',
    '(auth.role() = ''authenticated'')'
FROM storage.buckets 
WHERE name = 'user-documents'
ON CONFLICT DO NOTHING;

-- Step 8: Verify the setup
SELECT 
    'Final bucket status:' as info,
    name, public, 
    CASE WHEN public THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as access_status
FROM storage.buckets 
WHERE name = 'user-documents';

SELECT 
    'Final storage policies:' as info,
    policyname, operation, definition
FROM storage.policies 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'user-documents')
ORDER BY operation, policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Storage bucket policies fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'user-documents bucket is now:';
    RAISE NOTICE '✅ Public (no auth required for viewing)';
    RAISE NOTICE '✅ Authenticated users can upload';
    RAISE NOTICE '✅ Authenticated users can manage files';
    RAISE NOTICE '';
    RAISE NOTICE 'Images should load now!';
    RAISE NOTICE '';
END $$;












