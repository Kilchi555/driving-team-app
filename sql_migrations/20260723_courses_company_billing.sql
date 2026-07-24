-- Company collective billing for private courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'individual';

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_billing_mode_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_billing_mode_check
  CHECK (billing_mode IN ('individual', 'company_collective'));

CREATE INDEX IF NOT EXISTS idx_courses_company_id ON public.courses(company_id)
  WHERE company_id IS NOT NULL;

COMMENT ON COLUMN public.courses.billing_mode IS 'individual = per participant; company_collective = one invoice to company';
COMMENT ON COLUMN public.courses.company_id IS 'Billing company for company_collective courses';
