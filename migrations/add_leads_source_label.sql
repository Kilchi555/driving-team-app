-- Add source_label to leads for per-campaign/per-flyer tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_label TEXT;
