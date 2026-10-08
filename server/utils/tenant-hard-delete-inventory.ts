/**
 * Schema-driven inventory for Superadmin tenant hard-delete.
 *
 * STATIC_TENANT_ID_TABLES is a production snapshot (information_schema).
 * Runtime prefers list_tenant_hard_delete_tables() RPC when available.
 * Only whitelisted table names are ever queried — never client-supplied.
 *
 * Classification:
 *  - no_fk: tenant_id exists but NO FK to tenants → must DELETE explicitly
 *  - no_action / restrict: FK exists but blocks tenant DELETE → must DELETE first
 *  - set_null: FK SET NULL → prefer explicit DELETE to avoid orphans
 *  - cascade: FK ON DELETE CASCADE → covered by DELETE FROM tenants (after blockers cleared)
 *  - financial_child: counted via payment_id join, not tenant_id
 */

export type TenantTableClass =
  | 'no_fk'
  | 'no_action'
  | 'restrict'
  | 'set_null'
  | 'cascade'
  | 'financial_child'

export interface TenantOwnedTable {
  table: string
  classification: TenantTableClass
  /** Human note for preview warnings */
  note?: string
}

/** UUID v4 / standard UUID shape — sole allowed tenant identifier format */
export const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isTenantUuid(value: unknown): value is string {
  return typeof value === 'string' && TENANT_UUID_RE.test(value)
}

/**
 * Expected confirmation text the Superadmin must type.
 * Server validates against the exact live tenant.name for the given UUID.
 */
export function expectedHardDeleteConfirmation(tenantName: string): string {
  return `DELETE ${tenantName}`
}

export function isHardDeleteConfirmationValid(
  confirmation: unknown,
  tenantName: string
): boolean {
  if (typeof confirmation !== 'string' || !tenantName) return false
  return confirmation === expectedHardDeleteConfirmation(tenantName)
}

/**
 * Explicit delete order documented for the RPC (single transactional path).
 * Client-side destructive fallback is intentionally NOT used in production.
 */
export const EXPLICIT_DELETE_ORDER: string[] = [
  'booking_events',
  'booking_redirects',
  'google_ads_conversion_uploads',
  'marketing_attributions',
  'marketing_ga4_daily',
  'marketing_google_ads_daily',
  'marketing_gsc_daily',
  'course_invoice_bindings',
  'email_campaign_leads',
  'email_campaign_variants',
  'email_campaigns',
  'email_templates',
  'imported_customers',
  'imported_invoices',
  'imported_records',
  'imports_batches',
  'lead_import_jobs',
  'leads',
  'marketing_google_ads_search_terms_daily',
  'public_course_invoice_mail_claims',
  'registration_sari_memberships',
  'reminder_providers',
  'reminder_settings',
  'reminder_templates',
  'session_confirmation_tokens',
  'staff_working_hour_exception_intervals',
  'user_discount_codes',
  'website_leads',
  'invoice_dunning_log',
  'marketing_meta_ads_daily',
  'marketing_meta_adsets_daily',
  'meta_capi_uploads',
  'website_lifecycle_events',
  'website_prospects',
  'webhook_logs',
  'payment_wallee_transactions',
  'payment_audit_logs',
  'payment_refunds',
  'payment_reminders',
  'payment_access_grants',
  'refund_requests',
  'payments',
]

/** Map delete_rule from information_schema to TenantTableClass */
export function classifyDeleteRule(rule: string | null | undefined): TenantTableClass {
  const r = (rule || 'NO FK').toUpperCase()
  if (r === 'CASCADE') return 'cascade'
  if (r === 'SET NULL') return 'set_null'
  if (r === 'RESTRICT') return 'restrict'
  if (r === 'NO ACTION') return 'no_action'
  return 'no_fk'
}

/** Production snapshot of every public.* table with a tenant_id column (excl. audit jobs). */
export const TENANT_OWNED_TABLES: TenantOwnedTable[] = [
  { table: 'booking_events', classification: 'no_action', note: 'FK NO ACTION — blocks bare tenant DELETE' },
  { table: 'booking_redirects', classification: 'no_action' },
  { table: 'google_ads_conversion_uploads', classification: 'no_action' },
  { table: 'marketing_attributions', classification: 'no_action' },
  { table: 'marketing_ga4_daily', classification: 'no_action' },
  { table: 'marketing_google_ads_daily', classification: 'no_action' },
  { table: 'marketing_gsc_daily', classification: 'no_action' },
  { table: 'course_invoice_bindings', classification: 'restrict', note: 'FK RESTRICT — must delete before tenant' },
  { table: 'email_campaigns', classification: 'no_fk' },
  { table: 'email_templates', classification: 'no_fk' },
  { table: 'imported_customers', classification: 'no_fk' },
  { table: 'imported_invoices', classification: 'no_fk' },
  { table: 'imported_records', classification: 'no_fk' },
  { table: 'imports_batches', classification: 'no_fk' },
  { table: 'lead_import_jobs', classification: 'no_fk' },
  { table: 'leads', classification: 'no_fk', note: 'tenant_id without FK — orphans if not deleted' },
  { table: 'marketing_google_ads_search_terms_daily', classification: 'no_fk' },
  { table: 'public_course_invoice_mail_claims', classification: 'no_fk' },
  { table: 'registration_sari_memberships', classification: 'no_fk' },
  { table: 'reminder_providers', classification: 'no_fk' },
  { table: 'reminder_settings', classification: 'no_fk' },
  { table: 'reminder_templates', classification: 'no_fk', note: 'tenant_id NULL rows are global — never delete NULL-tenant templates' },
  { table: 'session_confirmation_tokens', classification: 'no_fk' },
  { table: 'staff_working_hour_exception_intervals', classification: 'no_fk' },
  { table: 'user_discount_codes', classification: 'no_fk' },
  { table: 'website_leads', classification: 'no_fk' },
  { table: 'invoice_dunning_log', classification: 'set_null' },
  { table: 'marketing_meta_ads_daily', classification: 'set_null' },
  { table: 'marketing_meta_adsets_daily', classification: 'set_null' },
  { table: 'meta_capi_uploads', classification: 'set_null' },
  { table: 'website_lifecycle_events', classification: 'set_null' },
  { table: 'website_prospects', classification: 'set_null', note: 'DELETE owned rows only; null matched_tenant_id for other owners' },
  { table: 'account_switch_grants', classification: 'cascade' },
  { table: 'accountant_grants', classification: 'cascade' },
  { table: 'accounting_accounts', classification: 'cascade' },
  { table: 'accounting_budget_lines', classification: 'cascade' },
  { table: 'accounting_categories', classification: 'cascade' },
  { table: 'accounting_entries', classification: 'cascade' },
  { table: 'accounting_journal_lines', classification: 'cascade' },
  { table: 'accounting_recurring_entries', classification: 'cascade' },
  { table: 'admin_notifications', classification: 'cascade' },
  { table: 'affiliate_category_rewards', classification: 'cascade' },
  { table: 'affiliate_codes', classification: 'cascade' },
  { table: 'affiliate_leads', classification: 'cascade' },
  { table: 'affiliate_payout_requests', classification: 'cascade' },
  { table: 'affiliate_referrals', classification: 'cascade' },
  { table: 'analytics_events', classification: 'cascade' },
  { table: 'appointment_preferences', classification: 'cascade' },
  { table: 'appointments', classification: 'cascade' },
  { table: 'audit_logs', classification: 'cascade' },
  { table: 'availability_recalc_queue', classification: 'cascade' },
  { table: 'availability_settings', classification: 'cascade' },
  { table: 'availability_slots', classification: 'cascade' },
  { table: 'bank_import_records', classification: 'cascade' },
  { table: 'booking_proposals', classification: 'cascade' },
  { table: 'cancellation_policies', classification: 'cascade' },
  { table: 'cancellation_reasons', classification: 'cascade' },
  { table: 'cancellation_rules', classification: 'cascade' },
  { table: 'cash_balances', classification: 'cascade' },
  { table: 'cash_confirmations', classification: 'cascade' },
  { table: 'cash_daily_closes', classification: 'cascade' },
  { table: 'cash_movements', classification: 'cascade' },
  { table: 'cash_registers', classification: 'cascade' },
  { table: 'cash_transactions', classification: 'cascade' },
  { table: 'categories', classification: 'cascade' },
  { table: 'companies', classification: 'cascade' },
  { table: 'company_billing_addresses', classification: 'cascade' },
  { table: 'correspondence', classification: 'cascade' },
  { table: 'correspondence_messages', classification: 'cascade' },
  { table: 'course_categories', classification: 'cascade' },
  { table: 'course_leads', classification: 'cascade' },
  { table: 'course_pricing_rules', classification: 'cascade' },
  { table: 'course_registrations', classification: 'cascade' },
  { table: 'course_sessions', classification: 'cascade' },
  { table: 'course_waitlist', classification: 'cascade' },
  { table: 'courses', classification: 'cascade' },
  { table: 'credit_transactions', classification: 'cascade' },
  { table: 'customer_payment_methods', classification: 'cascade' },
  { table: 'discount_codes', classification: 'cascade' },
  { table: 'discount_sales', classification: 'cascade' },
  { table: 'discounts', classification: 'cascade' },
  { table: 'document_categories', classification: 'cascade' },
  { table: 'dunning_settings', classification: 'cascade' },
  { table: 'dunning_templates', classification: 'cascade' },
  { table: 'email_accounts', classification: 'cascade' },
  { table: 'email_knowledge', classification: 'cascade' },
  { table: 'email_messages', classification: 'cascade' },
  { table: 'error_logs', classification: 'cascade' },
  { table: 'evaluation_categories', classification: 'cascade' },
  { table: 'evaluation_criteria', classification: 'cascade' },
  { table: 'evaluation_scale', classification: 'cascade' },
  { table: 'event_types', classification: 'cascade' },
  { table: 'exam_results', classification: 'cascade' },
  { table: 'examiners', classification: 'cascade' },
  { table: 'external_busy_times', classification: 'cascade' },
  { table: 'external_calendars', classification: 'cascade' },
  { table: 'external_partners', classification: 'cascade' },
  { table: 'gbp_audits', classification: 'cascade' },
  { table: 'gbp_automation_settings', classification: 'cascade' },
  { table: 'gbp_insights_daily', classification: 'cascade' },
  { table: 'gbp_locations', classification: 'cascade' },
  { table: 'gbp_media_assets', classification: 'cascade' },
  { table: 'gbp_post_calendar', classification: 'cascade' },
  { table: 'gbp_review_actions', classification: 'cascade' },
  { table: 'gbp_scheduled_posts', classification: 'cascade' },
  { table: 'general_resource_bookings', classification: 'cascade' },
  { table: 'general_resources', classification: 'cascade' },
  { table: 'guest_otps', classification: 'cascade' },
  { table: 'guest_sessions', classification: 'cascade' },
  { table: 'impersonation_sessions', classification: 'cascade' },
  { table: 'instructor_invitations', classification: 'cascade' },
  { table: 'invited_customers', classification: 'cascade' },
  { table: 'invoice_items', classification: 'cascade' },
  { table: 'invoice_payments', classification: 'cascade' },
  { table: 'invoices', classification: 'cascade' },
  { table: 'lead_categories', classification: 'cascade' },
  { table: 'locations', classification: 'cascade' },
  { table: 'login_security_rules', classification: 'cascade' },
  { table: 'marketing_ads_guardrail_actions', classification: 'cascade' },
  { table: 'marketing_google_ads_keywords_daily', classification: 'cascade' },
  { table: 'marketing_meta_accounts', classification: 'cascade' },
  { table: 'marketing_meta_ads_ad_daily', classification: 'cascade' },
  { table: 'marketing_offers', classification: 'cascade' },
  { table: 'marketing_weekly_reviews', classification: 'cascade' },
  { table: 'notes', classification: 'cascade' },
  { table: 'office_cash_registers', classification: 'cascade' },
  { table: 'outbound_messages_queue', classification: 'cascade' },
  { table: 'partner_offer_requests', classification: 'cascade' },
  { table: 'payment_access_grants', classification: 'cascade' },
  { table: 'payment_logs', classification: 'cascade' },
  { table: 'payment_methods', classification: 'cascade' },
  { table: 'payment_refunds', classification: 'cascade' },
  { table: 'payment_reminders', classification: 'cascade' },
  { table: 'payments', classification: 'cascade', note: 'Financial; clear NO ACTION payment/appointment deps before delete' },
  { table: 'payroll_employees', classification: 'cascade' },
  { table: 'payroll_runs', classification: 'cascade' },
  { table: 'pendencies', classification: 'cascade' },
  { table: 'pending_quotes', classification: 'cascade' },
  { table: 'platform_referral_codes', classification: 'cascade' },
  { table: 'price_calculation_leads', classification: 'cascade' },
  { table: 'pricing_rules', classification: 'cascade' },
  { table: 'product_sales', classification: 'cascade' },
  { table: 'products', classification: 'cascade' },
  { table: 'push_tokens', classification: 'cascade' },
  { table: 'rate_limit_logs', classification: 'cascade' },
  { table: 'refund_requests', classification: 'cascade' },
  { table: 'reglement_sections', classification: 'cascade' },
  { table: 'reminder_logs', classification: 'cascade' },
  { table: 'room_bookings', classification: 'cascade' },
  { table: 'rooms', classification: 'cascade' },
  { table: 'sari_course_mapping', classification: 'cascade' },
  { table: 'sari_customer_mapping', classification: 'cascade' },
  { table: 'sari_sync_logs', classification: 'cascade' },
  { table: 'simy_ai_usage', classification: 'cascade' },
  { table: 'sms_logs', classification: 'cascade' },
  { table: 'staff_invitations', classification: 'cascade' },
  { table: 'staff_locations', classification: 'cascade' },
  { table: 'staff_monthly_hours', classification: 'cascade' },
  { table: 'staff_working_hour_exceptions', classification: 'cascade' },
  { table: 'staff_working_hours', classification: 'cascade' },
  { table: 'staff_year_carry_over', classification: 'cascade' },
  { table: 'student_credits', classification: 'cascade' },
  { table: 'student_withdrawal_preferences', classification: 'cascade' },
  { table: 'system_metrics', classification: 'cascade' },
  { table: 'tenant_analytics_summary', classification: 'cascade' },
  { table: 'tenant_assets', classification: 'cascade' },
  { table: 'tenant_google_connections', classification: 'cascade' },
  { table: 'tenant_reglements', classification: 'cascade' },
  { table: 'tenant_secrets', classification: 'cascade' },
  { table: 'tenant_settings', classification: 'cascade' },
  { table: 'token_context', classification: 'cascade' },
  { table: 'user_custom_field_values', classification: 'cascade' },
  { table: 'user_document_categories', classification: 'cascade' },
  { table: 'user_documents', classification: 'cascade' },
  { table: 'user_management_audit', classification: 'cascade' },
  { table: 'users', classification: 'cascade' },
  { table: 'vehicle_bookings', classification: 'cascade' },
  { table: 'vehicle_rentals', classification: 'cascade' },
  { table: 'vehicles', classification: 'cascade' },
  { table: 'voucher_codes', classification: 'cascade' },
  { table: 'voucher_redemptions', classification: 'cascade' },
  { table: 'vouchers', classification: 'cascade' },
  { table: 'website_revisions', classification: 'cascade' },
  { table: 'website_tenants', classification: 'cascade' },
  { table: 'payment_audit_logs', classification: 'financial_child' },
]

/** Unique table names for head-count preview/verify (tenant_id column). */
export function previewCountTables(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of TENANT_OWNED_TABLES) {
    if (seen.has(row.table)) continue
    // payment_audit_logs counted via payments, not tenant_id
    if (row.table === 'payment_audit_logs') continue
    seen.add(row.table)
    out.push(row.table)
  }
  return out
}

/** Merge live RPC inventory with static snapshot (union, prefer live classification). */
export function mergeLiveTenantTables(
  live: Array<{ table: string; delete_rule?: string; tenant_id_nullable?: boolean }> | null | undefined
): TenantOwnedTable[] {
  if (!live || !live.length) return TENANT_OWNED_TABLES.filter((t) => t.classification !== 'financial_child')
  const byName = new Map<string, TenantOwnedTable>()
  for (const row of TENANT_OWNED_TABLES) {
    if (row.classification === 'financial_child') continue
    byName.set(row.table, row)
  }
  for (const row of live) {
    if (!row?.table || typeof row.table !== 'string') continue
    if (row.table === 'tenant_hard_delete_jobs') continue
    // Only allow safe identifier shape
    if (!/^[a-z_][a-z0-9_]*$/i.test(row.table)) continue
    const classification = classifyDeleteRule(row.delete_rule)
    const prev = byName.get(row.table)
    byName.set(row.table, {
      table: row.table,
      classification,
      note: prev?.note,
    })
  }
  return Array.from(byName.values()).sort((a, b) => a.table.localeCompare(b.table))
}

export const FINANCIAL_TENANT_TABLES = [
  'payments',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'payment_refunds',
  'refund_requests',
  'student_credits',
  'credit_transactions',
  'cash_transactions',
  'cash_movements',
  'accounting_entries',
  'accounting_journal_lines',
] as const

export const PENDING_PAYMENT_STATUSES = [
  'pending',
  'partial',
  'authorized',
  'invoiced',
  'invoice',
] as const

/** Tables that must be cleared before DELETE payments (NO ACTION / RESTRICT). */
export const PAYMENT_NO_ACTION_DEPENDENTS = [
  { table: 'discounts', column: 'payment_id', action: 'set_null' as const },
  { table: 'reminder_logs', column: 'payment_id', action: 'set_null' as const },
  { table: 'course_registrations', column: 'payment_id', action: 'set_null' as const },
] as const

/** Tenant-scoped appointment NO ACTION dependents cleared before tenant CASCADE. */
export const APPOINTMENT_NO_ACTION_DEPENDENTS = [
  { table: 'cash_transactions', column: 'appointment_id', action: 'set_null' as const },
  { table: 'discount_sales', column: 'appointment_id', action: 'set_null' as const },
  { table: 'discounts', column: 'redeemed_for', action: 'set_null' as const },
  { table: 'invited_customers', column: 'appointment_id', action: 'set_null' as const },
  { table: 'invoice_items', column: 'appointment_id', action: 'set_null' as const },
  { table: 'reminder_logs', column: 'appointment_id', action: 'set_null' as const },
] as const

