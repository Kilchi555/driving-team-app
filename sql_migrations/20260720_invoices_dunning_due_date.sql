-- Speichert das aktuelle Zahlungsziel aus der letzten Zahlungserinnerung/Mahnung
-- auf der Rechnung, damit Listen & Detailansicht das neue Fälligkeitsdatum zeigen
-- können (Original due_date bleibt unverändert für Rechnungs-PDF und {faelligkeitsdatum}).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS dunning_due_date DATE NULL;

COMMENT ON COLUMN invoices.dunning_due_date IS
  'Aktuelles Zahlungsziel aus der zuletzt versendeten Zahlungserinnerung/Mahnung. NULL = noch kein Mahnschreiben versendet, Fälligkeit = due_date.';

-- Backfill aus der Mahnhistorie (jeweils das neueste erfolgreiche new_due_date)
UPDATE invoices i
SET dunning_due_date = latest.new_due_date
FROM (
  SELECT DISTINCT ON (invoice_id)
    invoice_id,
    new_due_date
  FROM invoice_dunning_log
  WHERE status = 'sent'
    AND new_due_date IS NOT NULL
  ORDER BY invoice_id, sent_at DESC
) latest
WHERE i.id = latest.invoice_id
  AND i.dunning_due_date IS NULL;

-- invoices_with_details um die Spalte erweitern (am Ende anhängen)
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
    i.dunning_fees_rappen,
    i.dunning_due_date
   FROM (invoices i
     LEFT JOIN users u ON ((i.user_id = u.id)));
