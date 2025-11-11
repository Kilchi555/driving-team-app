-- Update user-documents bucket file size limit to 5MB
UPDATE storage.buckets 
SET file_size_limit = 5242880  -- 5MB in bytes
WHERE id = 'user-documents';

-- Verify the change
SELECT 
    id,
    name,
    public,
    file_size_limit,
    file_size_limit / 1024 / 1024 as file_size_mb,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-documents';

