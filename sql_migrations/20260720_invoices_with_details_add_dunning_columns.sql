-- 20260720_invoices_with_details_add_dunning_columns.sql
-- The invoices_with_details view predates the dunning system and is missing
-- dunning_level / dunning_paused / last_dunning_sent_at / dunning_fees_rappen.
-- This meant list-style consumers (e.g. /api/invoices/list used by
-- pages/admin/invoices.vue) could never show the current dunning status —
-- only the InvoiceDetailModal could, because it loads dunning state via a
-- separate /api/invoices/dunning-log call.
--
-- Adding the columns here lets any `select('*') from invoices_with_details`
-- consumer pick them up automatically, without extra round-trips.
--
-- NOTE: new columns must be appended at the end of the SELECT list —
-- `CREATE OR REPLACE VIEW` treats inserting columns in the middle as an
-- (unsupported) column rename.

CREATE OR REPLACE VIEW public.invoices_with_details WITH (security_invoker=on) AS
SELECT i.id,
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
    i.dunning_fees_rappen
   FROM (invoices i
     LEFT JOIN users u ON ((i.user_id = u.id)));
