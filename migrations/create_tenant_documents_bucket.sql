-- Create private storage bucket for tenant onboarding documents.
-- Service role can upload/read; no public access.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Service role full access
CREATE POLICY "service_role_all_tenant_documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tenant-documents' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'tenant-documents' AND auth.role() = 'service_role');
