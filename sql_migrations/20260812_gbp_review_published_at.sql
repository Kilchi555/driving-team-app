-- Track when a GBP review reply was actually published (insights activity metrics)
ALTER TABLE gbp_review_actions
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_gbp_review_actions_published_at
  ON gbp_review_actions (location_id, published_at DESC)
  WHERE status = 'published';

COMMENT ON COLUMN gbp_review_actions.published_at IS
  'When the reply was successfully published to Google Business Profile';
