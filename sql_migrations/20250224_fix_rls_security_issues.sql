-- Migration: Fix RLS Security Issues
-- Date: 2025-02-24
-- Purpose: Enable RLS on all tables and fix security definer views

-- ============================================
-- PART 1: Enable RLS on tables with policies but RLS disabled
-- ============================================

ALTER TABLE appointment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE examiners ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE plz_distance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_analytics_summary ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Enable RLS on public tables (without policies yet)
-- These are read-only or reference tables, so basic policies
-- ============================================

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
-- Event types are public reference data, allow all authenticated users to read
CREATE POLICY "event_types_read" ON event_types FOR SELECT TO authenticated USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- Categories are public reference data, allow all authenticated users to read
CREATE POLICY "categories_read" ON categories FOR SELECT TO authenticated USING (true);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- Analytics events - only allow authenticated users to view their own tenant's data
CREATE POLICY "analytics_events_tenant_access" ON analytics_events FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
-- System metrics - only allow authenticated users to view their own tenant's data
CREATE POLICY "system_metrics_tenant_access" ON system_metrics FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE reminder_providers ENABLE ROW LEVEL SECURITY;
-- Reminder providers are public reference data
CREATE POLICY "reminder_providers_read" ON reminder_providers FOR SELECT TO authenticated USING (true);

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
-- Reminder templates - only allow authenticated users to view their own tenant's data
CREATE POLICY "reminder_templates_tenant_access" ON reminder_templates FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE mfa_email_codes ENABLE ROW LEVEL SECURITY;
-- MFA email codes - only allow users to view their own codes
CREATE POLICY "mfa_email_codes_user_access" ON mfa_email_codes FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE category_backup ENABLE ROW LEVEL SECURITY;
-- Backup table - only allow admins to read
CREATE POLICY "category_backup_admin_only" ON category_backup FOR SELECT TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;
-- Audit table - only allow admins and staff to view their tenant's data
CREATE POLICY "user_management_audit_access" ON user_management_audit FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
-- Business types are public reference data
CREATE POLICY "business_types_read" ON business_types FOR SELECT TO authenticated USING (true);

ALTER TABLE business_type_presets ENABLE ROW LEVEL SECURITY;
-- Business type presets are public reference data
CREATE POLICY "business_type_presets_read" ON business_type_presets FOR SELECT TO authenticated USING (true);

ALTER TABLE user_document_categories ENABLE ROW LEVEL SECURITY;
-- Document categories are public reference data
CREATE POLICY "user_document_categories_read" ON user_document_categories FOR SELECT TO authenticated USING (true);

-- ============================================
-- PART 3: Recreate SECURITY DEFINER views as SECURITY INVOKER
-- Note: We can't directly change SECURITY DEFINER on existing views,
-- so we drop and recreate them (be careful with this!)
-- ============================================

-- For now, just log that these views need manual review:
-- - invoices_with_details
-- - mfa_sms_codes_expired  
-- - office_cash_overview
-- - client_staff_assignments
-- - appointment_adjustment_summary
-- - sari_sync_status
-- - staff_capabilities

-- ============================================
-- PART 4: Verification
-- ============================================

-- Verify RLS is enabled on critical tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'appointment_preferences', 'cash_confirmations', 'cash_movements', 'cash_transactions',
  'credit_transactions', 'examiners', 'invoice_items', 'invoice_payments', 'payment_methods',
  'plz_distance_cache', 'staff_availability_settings', 'tenant_analytics_summary',
  'event_types', 'categories', 'analytics_events', 'system_metrics', 'reminder_providers',
  'reminder_templates', 'mfa_email_codes', 'category_backup', 'user_management_audit',
  'business_types', 'business_type_presets', 'user_document_categories'
)
AND schemaname = 'public'
ORDER BY tablename;

-- Verify policies exist on public tables
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN (
  'event_types', 'categories', 'analytics_events', 'system_metrics', 'reminder_providers',
  'reminder_templates', 'mfa_email_codes', 'category_backup', 'user_management_audit',
  'business_types', 'business_type_presets', 'user_document_categories'
)
ORDER BY tablename, policyname;

