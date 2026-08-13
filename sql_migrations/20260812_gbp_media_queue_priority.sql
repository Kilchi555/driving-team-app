-- Queue ordering for GBP photo automation (higher = sooner)
ALTER TABLE gbp_media_assets
  ADD COLUMN IF NOT EXISTS queue_priority integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gbp_media_assets_queue_priority
  ON gbp_media_assets (tenant_id, location_id, approved, queue_priority DESC, last_published_at ASC NULLS FIRST);

COMMENT ON COLUMN gbp_media_assets.queue_priority IS
  'Higher values publish sooner in the drip queue; reset to 0 after publish';
