-- Public bucket for tenant assets + GBP photo pool (server/service-role uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read tenant-assets" ON storage.objects;
CREATE POLICY "Public read tenant-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-assets');

DROP POLICY IF EXISTS "Service role all tenant-assets" ON storage.objects;
CREATE POLICY "Service role all tenant-assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tenant-assets' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'tenant-assets' AND auth.role() = 'service_role');
