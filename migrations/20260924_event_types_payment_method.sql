-- Appointment payment hierarchy: event type may override the tenant default.
-- NULL means inherit tenant default. No backfill. Existing payments are untouched.
-- credit is a payment snapshot, not an event-type default.

ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.event_types
  DROP CONSTRAINT IF EXISTS event_types_payment_method_check;

ALTER TABLE public.event_types
  ADD CONSTRAINT event_types_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('wallee', 'cash', 'invoice')
  );

COMMENT ON COLUMN public.event_types.payment_method IS
  'Optional appointment payment default. NULL inherits tenant payment_settings.default_payment_method. Not a course payment method and not invoice timing.';
