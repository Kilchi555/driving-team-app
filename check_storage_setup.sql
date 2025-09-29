-- Check Supabase Storage setup for user-documents bucket

-- 1. Check if bucket exists and its settings
SELECT 
    id,
    name,
    public,
    created_at,
    updated_at,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-documents';

-- 2. Check storage policies for user-documents bucket
SELECT 
    id,
    name,
    bucket_id,
    definition,
    check_definition
FROM storage.policies 
WHERE bucket_id = 'user-documents';

-- 3. Test basic storage access
SELECT 
    'Storage bucket test' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-documents') 
        THEN '✅ Bucket exists'
        ELSE '❌ Bucket missing'
    END as bucket_status;

-- 4. Check if licenses folder exists in storage
SELECT 
    name,
    bucket_id,
    created_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'user-documents' 
AND name LIKE 'licenses/%'
LIMIT 5;
