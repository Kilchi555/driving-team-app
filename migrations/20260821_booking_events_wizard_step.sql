-- Track booking wizard drop-off per tenant (Hauptkat. → Bestätigung)
ALTER TABLE public.booking_events
  ADD COLUMN IF NOT EXISTS step numeric,
  ADD COLUMN IF NOT EXISTS step_label text;

ALTER TABLE public.booking_events DROP CONSTRAINT IF EXISTS booking_events_event_type_check;
ALTER TABLE public.booking_events ADD CONSTRAINT booking_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'viewed'::text,
    'started'::text,
    'step'::text,
    'completed'::text,
    'abandoned'::text,
    'inquiry_submitted'::text
  ]));

CREATE INDEX IF NOT EXISTS booking_events_tenant_step_idx
  ON public.booking_events (tenant_id, event_type, step, created_at DESC);
