-- Migration: Fix SECURITY DEFINER Views → SECURITY INVOKER
-- Date: 2025-02-24
-- Purpose: Convert 7 views from SECURITY DEFINER to SECURITY INVOKER for better security

-- ============================================
-- Drop existing views (with CASCADE to handle dependencies)
-- ============================================
DROP VIEW IF EXISTS public.appointment_adjustment_summary CASCADE;
DROP VIEW IF EXISTS public.client_staff_assignments CASCADE;
DROP VIEW IF EXISTS public.invoices_with_details CASCADE;
DROP VIEW IF EXISTS public.mfa_sms_codes_expired CASCADE;
DROP VIEW IF EXISTS public.office_cash_overview CASCADE;
DROP VIEW IF EXISTS public.sari_sync_status CASCADE;
DROP VIEW IF EXISTS public.staff_capabilities CASCADE;

-- ============================================
-- Recreate views with SECURITY INVOKER
-- ============================================

-- 1. appointment_adjustment_summary
CREATE VIEW public.appointment_adjustment_summary WITH (security_invoker=on) AS
SELECT a.id AS appointment_id,
    a.user_id,
    a.staff_id,
    a.start_time,
    a.duration_minutes,
    a.original_price_rappen,
    a.price_adjustment_rappen,
    (a.original_price_rappen + COALESCE(a.price_adjustment_rappen, 0)) AS current_total_price,
    count(apa.id) AS adjustment_count,
    sum(
        CASE
            WHEN ((apa.adjustment_type)::text = 'credit'::text) THEN apa.adjustment_amount_rappen
            ELSE 0
        END) AS total_credits,
    sum(
        CASE
            WHEN ((apa.adjustment_type)::text = 'charge'::text) THEN apa.adjustment_amount_rappen
            ELSE 0
        END) AS total_charges,
    max(apa.created_at) AS last_adjustment_date
   FROM (appointments a
     LEFT JOIN appointment_price_adjustments apa ON ((a.id = apa.appointment_id)))
  WHERE (a.original_price_rappen IS NOT NULL)
  GROUP BY a.id, a.user_id, a.staff_id, a.start_time, a.duration_minutes, a.original_price_rappen, a.price_adjustment_rappen;

-- 2. client_staff_assignments
CREATE VIEW public.client_staff_assignments WITH (security_invoker=on) AS
SELECT c.id AS client_id,
    c.first_name AS client_first_name,
    c.last_name AS client_last_name,
    c.category AS client_category,
    s.id AS staff_id,
    s.first_name AS staff_first_name,
    s.last_name AS staff_last_name,
    s.category AS staff_categories,
    c.tenant_id
   FROM (users c
     JOIN users s ON ((s.tenant_id = c.tenant_id)))
  WHERE ((c.role = 'client'::text) AND (s.role = 'staff'::text) AND (c.is_active = true) AND (s.is_active = true) AND ((c.category IS NULL) OR (s.category @> ARRAY[c.category])));

-- 3. invoices_with_details
CREATE VIEW public.invoices_with_details WITH (security_invoker=on) AS
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
    u.phone AS customer_phone
   FROM (invoices i
     LEFT JOIN users u ON ((i.user_id = u.id)));

-- 4. mfa_sms_codes_expired
CREATE VIEW public.mfa_sms_codes_expired WITH (security_invoker=on) AS
SELECT id,
    user_id,
    code,
    phone_number,
    expires_at
   FROM mfa_sms_codes
  WHERE ((expires_at < now()) AND (used_at IS NULL));

-- 5. office_cash_overview
CREATE VIEW public.office_cash_overview WITH (security_invoker=on) AS
SELECT ocr.id AS register_id,
    ocr.name AS register_name,
    ocr.description,
    ocr.location,
    ocr.register_type,
    ocr.is_main_register,
    ocr.tenant_id,
    COALESCE(cb.current_balance_rappen, 0) AS current_balance_rappen,
    array_agg(
        CASE
            WHEN (ocsa.staff_id IS NOT NULL) THEN json_build_object('staff_id', ocsa.staff_id, 'staff_name', ((u.first_name || ' '::text) || u.last_name), 'access_level', ocsa.access_level, 'is_active', ocsa.is_active)
            ELSE NULL::json
        END) FILTER (WHERE (ocsa.staff_id IS NOT NULL)) AS assigned_staff,
    max(cm.created_at) AS last_activity
   FROM ((((office_cash_registers ocr
     LEFT JOIN cash_balances cb ON ((ocr.id = cb.office_cash_register_id)))
     LEFT JOIN office_cash_staff_assignments ocsa ON ((ocr.id = ocsa.cash_register_id)))
     LEFT JOIN users u ON ((ocsa.staff_id = u.id)))
     LEFT JOIN cash_movements cm ON ((ocr.id = cm.office_cash_register_id)))
  WHERE (ocr.is_active = true)
  GROUP BY ocr.id, ocr.name, ocr.description, ocr.location, ocr.register_type, ocr.is_main_register, ocr.tenant_id, cb.current_balance_rappen;

-- 6. sari_sync_status
CREATE VIEW public.sari_sync_status WITH (security_invoker=on) AS
SELECT id AS tenant_id,
    name,
    sari_enabled,
    sari_environment,
    sari_last_sync_at,
    ( SELECT count(*) AS count
           FROM sari_sync_logs
          WHERE (sari_sync_logs.tenant_id = t.id)) AS total_sync_operations,
    ( SELECT sari_sync_logs.status
           FROM sari_sync_logs
          WHERE (sari_sync_logs.tenant_id = t.id)
          ORDER BY sari_sync_logs.created_at DESC
         LIMIT 1) AS last_sync_status,
    ( SELECT sari_sync_logs.created_at
           FROM sari_sync_logs
          WHERE (sari_sync_logs.tenant_id = t.id)
          ORDER BY sari_sync_logs.created_at DESC
         LIMIT 1) AS last_sync_at
   FROM tenants t
  WHERE (sari_enabled = true);

-- 7. staff_capabilities
CREATE VIEW public.staff_capabilities WITH (security_invoker=on) AS
SELECT id,
    first_name,
    last_name,
    email,
    phone,
    category,
    unnest(category) AS individual_category,
    is_active,
    tenant_id
   FROM users u
  WHERE ((role = 'staff'::text) AND (is_active = true) AND (category IS NOT NULL));

-- ============================================
-- Verification
-- ============================================
-- Verify all views are recreated with SECURITY INVOKER
SELECT 
  viewname,
  schemaname,
  pg_get_viewdef(quote_ident(viewname), true) as definition
FROM pg_views 
WHERE viewname IN (
  'appointment_adjustment_summary',
  'client_staff_assignments',
  'invoices_with_details',
  'mfa_sms_codes_expired',
  'office_cash_overview',
  'sari_sync_status',
  'staff_capabilities'
)
AND schemaname = 'public'
ORDER BY viewname;
