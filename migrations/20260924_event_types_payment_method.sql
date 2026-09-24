-- Appointment payment-method hierarchy: optional per-event-type override.
-- NULL means inherit the tenant default (tenant_settings payment_settings.default_payment_method).
-- Existing rows stay NULL. No backfill of payments, appointments, or invoices.
-- credit is a payment-row action, not a valid event-type default.

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
  'Optional appointment payment-method override. NULL = inherit tenant default (wallee, cash, or invoice). credit is not allowed here.';
