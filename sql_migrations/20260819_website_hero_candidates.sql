-- Shared hero suggestion cache (stock + AI). Filled on first fetch, reused next time.
CREATE TABLE IF NOT EXISTS public.website_hero_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('stock', 'ai')),
  query_key text NOT NULL,
  external_id text NOT NULL,
  preview_url text NOT NULL,
  hotlink_url text,
  photographer text,
  photographer_url text,
  unsplash_url text,
  download_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_served_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS website_hero_candidates_uniq
  ON public.website_hero_candidates (source, query_key, external_id);

CREATE INDEX IF NOT EXISTS website_hero_candidates_serve_idx
  ON public.website_hero_candidates (source, query_key, last_served_at);

ALTER TABLE public.website_hero_candidates ENABLE ROW LEVEL SECURITY;
-- Server-only via service role. No anon/authenticated policies.
