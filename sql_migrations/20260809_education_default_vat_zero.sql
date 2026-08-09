-- CH education verticals (Fahrschule, Nachhilfe, Musikschule) are typically
-- VAT-exempt. Column default was 8.10 which incorrectly prefilled new tenants.
-- New default: 0.00 (register API still sets 8.1 explicitly for non-education).

ALTER TABLE public.tenants
  ALTER COLUMN default_vat_rate SET DEFAULT 0.00;

UPDATE public.tenants
SET default_vat_rate = 0.00,
    updated_at = NOW()
WHERE business_type IN ('driving_school', 'tutoring', 'music_school')
  AND default_vat_rate IS DISTINCT FROM 0.00;
