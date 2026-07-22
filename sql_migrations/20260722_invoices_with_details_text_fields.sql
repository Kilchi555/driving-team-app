-- Expose payment_terms + footer_text on invoices_with_details.
-- Drop+recreate required when inserting columns (CREATE OR REPLACE cannot rename mid-list).
DROP VIEW IF EXISTS public.invoices_with_details;

CREATE VIEW public.invoices_with_details AS
SELECT
  i.id,
  i.invoice_number,
  i.user_id,
  i.staff_id,
  i.appointment_id,
  i.product_sale_id,
  i.tenant_id,
  i.billing_type,
  i.billing_company_name,
  i.billing_contact_person,
  i.billing_street,
  i.billing_street_number,
  i.billing_zip,
  i.billing_city,
  i.billing_country,
  i.billing_vat_number,
  i.billing_email,
  i.invoice_date,
  i.due_date,
  i.status,
  i.payment_status,
  i.payment_method,
  i.subtotal_rappen,
  i.vat_rate,
  i.vat_amount_rappen,
  i.total_amount_rappen,
  i.discount_amount_rappen,
  i.paid_amount_rappen,
  i.paid_at,
  i.sent_at,
  i.notes,
  i.internal_notes,
  i.created_at,
  i.updated_at,
  u.first_name AS customer_first_name,
  u.last_name AS customer_last_name,
  u.email AS customer_email,
  u.phone AS customer_phone,
  i.dunning_level,
  i.dunning_paused,
  i.last_dunning_sent_at,
  i.dunning_fees_rappen,
  i.dunning_due_date,
  i.payment_terms,
  i.footer_text
FROM invoices i
LEFT JOIN users u ON i.user_id = u.id;

GRANT SELECT ON public.invoices_with_details TO authenticated;
GRANT SELECT ON public.invoices_with_details TO service_role;
