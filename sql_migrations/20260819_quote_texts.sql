ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS quote_intro_text text,
  ADD COLUMN IF NOT EXISTS quote_terms_text text,
  ADD COLUMN IF NOT EXISTS quote_footer_text text;
