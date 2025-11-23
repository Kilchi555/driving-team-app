-- Enable public read access to documents storage bucket
-- This allows authenticated and unauthenticated users to view uploaded documents

-- Create policy to allow anyone to read documents
CREATE POLICY "Allow public read access to documents" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents');

-- Create policy to allow authenticated users to upload documents
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (SELECT auth.uid()) IS NOT NULL
  );

-- Create policy to allow users to delete their own documents
CREATE POLICY "Allow users to delete their own documents" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (SELECT auth.uid()) IS NOT NULL
  );

