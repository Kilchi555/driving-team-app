-- ÜBERSICHT: Alle Trigger in der Datenbank
-- Diese Liste zeigt welche Trigger wo und warum existieren

-- TRIGGER KATEGORIEN:

-- 1. UPDATED_AT AUTO-UPDATE TRIGGER (am meisten verwendet)
-- Diese Trigger setzen automatisch updated_at = NOW() bei jedem UPDATE
-- Tabellen mit dieser Logik:
--   - cancellation_policies
--   - cancellation_rules
--   - pendencies
--   - password_reset_tokens
--   - tenant_reglements
--   - reglement_sections
--   - appointment_preferences
--   - staff_availability_settings
--   - plz_distance_cache
--   - staff_category_availability
--   - user_devices
--   - user_documents
--   - cash_registers
--   - resource_types
--   - general_resources
--   - general_resource_bookings
--   - evaluation_categories
--   - evaluation_criteria
--   - external_calendars
--   - tenant_branding_templates
--   - tenants
--   - tenant_settings
--   - student_credits
--   - reminder_settings
--   - reminder_templates
--   - reminder_providers
--   - discount_codes
--   - products
--   - payments
--   - discounts
--   - cash_transactions
--   - cash_balances
--   - appointment_discounts
--   - tenant_analytics_summary
--   - staff_working_hours
--   - staff_categories
--   - staff_locations
--   - availability_settings
--   - vehicles (courses)
--   - rooms (courses)
--   - courses
--   - course_sessions
--   - course_registrations
--   - course_waitlist
--   - room_bookings
--   - vehicle_bookings

-- 2. BUSINESS LOGIC TRIGGER (komplexe Operationen)
-- Diese Trigger führen komplexe Geschäftslogik aus:

-- on_auth_user_created (in auth.users)
--   -> Erstellt automatisch einen User Record wenn auth User erstellt wird

-- trigger_create_staff_cash (users tabelle, AFTER INSERT/UPDATE)
--   -> Erstellt automatisch cash_balances für neue Staff

-- trigger_create_cash_transaction (payments, AFTER INSERT/UPDATE)
--   -> Erstellt automatisch Cash-Transaktionen für Zahlungen

-- trigger_automatic_cash_withdrawal (cash_transactions, AFTER INSERT/UPDATE)
--   -> Automatische Auszahlungen

-- trigger_update_payment_total (payment_items)
--   -> Berechnet automatisch Payment Totals

-- trigger_generate_invoice_number (invoices)
--   -> Generiert automatisch Invoice Nummern

-- trigger_calculate_invoice_vat (invoices)
--   -> Berechnet automatisch VAT auf Invoices

-- trigger_set_invoice_due_date (invoices)
--   -> Setzt automatisch Fälligkeitsdatum

-- trigger_update_invoice_status (invoices)
--   -> Aktualisiert Invoice Status

-- trigger_update_appointment_status_on_invoice_paid (invoices)
--   -> Ändert Appointment Status wenn Invoice bezahlt wird

-- trigger_populate_invoice_items (invoices)
--   -> Erstellt automatisch Invoice Items

-- trigger_increment_voucher_redemptions (voucher_redemptions)
--   -> Erhöht Voucher Redemption Counter

-- trigger_update_appointment_adjustment (appointment_price_adjustments)
--   -> Passt Appointment Preise an

-- trigger_generate_voucher_code (vouchers)
--   -> Generiert automatisch Voucher Codes

-- trigger_check_general_resource_booking_conflicts
--   -> Prüft auf Buchungskonflikte

-- EMPFEHLUNG:
-- ✅ UPDATED_AT Trigger: SOLLEN BLEIBEN - sind unverzichtbar
-- ⚠️ BUSINESS LOGIC Trigger: ÜBERPRÜFEN - könnten zu unerwartetem Verhalten führen
-- ❓ Manche davon sind möglicherweise outdated oder dupliziert

-- QUERY um alle Trigger anzuschauen:
SELECT trigger_schema, trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

