-- Optional per-course invoice timing.
-- NULL means the course has no override. Category and tenant resolution stay unchanged.
-- immediate bills a public INVOICE enrollment immediately.
-- No default of immediate. No backfill. No payment_method changes.
-- Not applied by application deploy.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS invoice_timing_mode text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_invoice_timing_mode_chk'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_invoice_timing_mode_chk
      CHECK (invoice_timing_mode IS NULL OR invoice_timing_mode = 'immediate');
  END IF;
END $$;

COMMENT ON COLUMN public.courses.invoice_timing_mode IS
  'Optional course override for public course-invoice timing. NULL uses category then tenant. immediate creates the invoice on successful public enrollment. Not a payment method.';
