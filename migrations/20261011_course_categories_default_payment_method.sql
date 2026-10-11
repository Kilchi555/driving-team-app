-- Optional per-category default Zahlungsart for new course creation.
-- NULL = inherit the tenant Standard-Zahlungsart (existing behavior).
-- Does not change courses.payment_method snapshot semantics for existing courses.
-- Separate from invoice_timing_mode (Rechnungsstellung).

ALTER TABLE public.course_categories
  ADD COLUMN IF NOT EXISTS default_payment_method text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_categories_default_payment_method_chk'
      AND conrelid = 'public.course_categories'::regclass
  ) THEN
    ALTER TABLE public.course_categories
      ADD CONSTRAINT course_categories_default_payment_method_chk
      CHECK (
        default_payment_method IS NULL
        OR default_payment_method IN ('WALLEE', 'CASH_ON_SITE', 'INVOICE')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.course_categories.default_payment_method IS
  'Optional default courses.payment_method when creating a course from this category. NULL = tenant Standard-Zahlungsart. Independent of invoice_timing_mode.';
