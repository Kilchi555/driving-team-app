-- Website media bucket: hero images + hero videos (public read, service-role write)
-- Videos: MP4/WebM up to 40MB (no server transcode yet)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-media',
  'website-media',
  true,
  41943040,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read website-media" ON storage.objects;
CREATE POLICY "Public read website-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-media');

DROP POLICY IF EXISTS "Service role write website-media" ON storage.objects;
CREATE POLICY "Service role write website-media"
  ON storage.objects FOR ALL
  USING (bucket_id = 'website-media' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'website-media' AND auth.role() = 'service_role');
