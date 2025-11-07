-- Add legal company name to tenants
-- This column stores the official/legal company name for use on receipts/invoices

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS legal_company_name text;

COMMENT ON COLUMN public.tenants.legal_company_name IS 'Official/legal company name used on receipts and invoices.';


