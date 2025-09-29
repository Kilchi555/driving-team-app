-- Add require_payment flag to event_types
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS require_payment boolean NOT NULL DEFAULT false;

-- Backfill: paid types by default
UPDATE public.event_types
SET require_payment = true
WHERE code IN ('lesson', 'exam', 'theory');

-- Optional: ensure display_order exists for consistent ordering
-- (Skip if your schema already guarantees it)
-- ALTER TABLE public.event_types
-- ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;


