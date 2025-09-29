-- Setup Storage Policies for user-documents bucket
-- This ensures authenticated users can upload and access license files

-- 1. Ensure bucket exists (should already exist based on error)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'user-documents', 
  'user-documents', 
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

-- 2. Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts (if they exist)
DROP POLICY IF EXISTS "Authenticated users can upload license files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view license files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all files" ON storage.objects;

-- 4. Create upload policy for authenticated users
CREATE POLICY "Authenticated users can upload license files" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'user-documents'
  );

-- 5. Create download policy for authenticated users
CREATE POLICY "Users can view license files" ON storage.objects
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'user-documents'
  );

-- 6. Create update/delete policy for file management
CREATE POLICY "Authenticated users can update license files" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'user-documents'
  );

CREATE POLICY "Authenticated users can delete license files" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    bucket_id = 'user-documents'
  );

-- 7. Verify setup
SELECT 
    'Storage bucket check' as test,
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'user-documents';

-- 8. Check RLS status
SELECT 
    'RLS status' as test,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';
