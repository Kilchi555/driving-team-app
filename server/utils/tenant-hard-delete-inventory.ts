/**
 * Schema-driven inventory for Superadmin tenant hard-delete.
 *
 * Tables are classified from live production FK discovery (information_schema).
 * Only whitelisted table names are ever queried/deleted — never client-supplied.
 *
 * Classification:
 *  - no_fk: tenant_id exists but NO FK to tenants → must DELETE explicitly
 *  - no_action / restrict: FK exists but blocks tenant DELETE → must DELETE first
 *  - set_null: FK SET NULL → prefer explicit DELETE to avoid orphans
 *  - cascade: FK ON DELETE CASCADE → covered by DELETE FROM tenants (after blockers cleared)
 *  - financial: subset used for warnings / ordered financial cleanup
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
 * Explicit delete order for DB transaction (before DELETE FROM tenants).
 * Order matters for NO ACTION / RESTRICT chains.
 */
export const EXPLICIT_DELETE_ORDER: string[] = [
  // NO ACTION / RESTRICT on tenants
  'booking_events',
  'booking_redirects',
  'google_ads_conversion_uploads',
  'marketing_attributions',
  'marketing_ga4_daily',
  'marketing_google_ads_daily',
  'marketing_gsc_daily',
  'course_invoice_bindings',

  // No-FK tenant_id tables (and campaign children first)
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

  // SET NULL — delete to avoid orphans
  'invoice_dunning_log',
  'marketing_meta_ads_daily',
  'marketing_meta_adsets_daily',
  'meta_capi_uploads',
  'website_lifecycle_events',
  'website_prospects',

  // Financial: clear payment dependents that RESTRICT, then payments before appointments
  'webhook_logs', // logical via payment_id (may lack FK)
  'payment_wallee_transactions',
  'payment_audit_logs',
  'payment_refunds',
  'payment_reminders',
  'payment_access_grants',
  'refund_requests',
  'payments',
]

/**
 * Full preview/verify inventory: every known public table with tenant_id,
 * plus key indirect children counted via join predicates in code.
 */
export const TENANT_OWNED_TABLES: TenantOwnedTable[] = [
  { table: 'booking_events', classification: 'no_action', note: 'FK NO ACTION — blocks bare tenant DELETE' },
  { table: 'booking_redirects', classification: 'no_action' },
  { table: 'google_ads_conversion_uploads', classification: 'no_action' },
  { table: 'marketing_attributions', classification: 'no_action' },
  { table: 'marketing_ga4_daily', classification: 'no_action' },
  { table: 'marketing_google_ads_daily', classification: 'no_action' },
  { table: 'marketing_gsc_daily', classification: 'no_action' },
  { table: 'course_invoice_bindings', classification: 'restrict' },

  { table: 'leads', classification: 'no_fk', note: 'tenant_id without FK — orphans if not deleted' },
  { table: 'email_campaigns', classification: 'no_fk' },
  { table: 'email_templates', classification: 'no_fk' },
  { table: 'imported_customers', classification: 'no_fk' },
  { table: 'imported_invoices', classification: 'no_fk' },
  { table: 'imported_records', classification: 'no_fk' },
  { table: 'imports_batches', classification: 'no_fk' },
  { table: 'lead_import_jobs', classification: 'no_fk' },
  { table: 'marketing_google_ads_search_terms_daily', classification: 'no_fk' },
  { table: 'public_course_invoice_mail_claims', classification: 'no_fk' },
  { table: 'registration_sari_memberships', classification: 'no_fk' },
  { table: 'reminder_providers', classification: 'no_fk' },
  { table: 'reminder_settings', classification: 'no_fk' },
  { table: 'reminder_templates', classification: 'no_fk' },
  { table: 'session_confirmation_tokens', classification: 'no_fk' },
  { table: 'staff_working_hour_exception_intervals', classification: 'no_fk' },
  { table: 'user_discount_codes', classification: 'no_fk' },
  { table: 'website_leads', classification: 'no_fk' },

  { table: 'meta_capi_uploads', classification: 'set_null' },
  { table: 'invoice_dunning_log', classification: 'set_null' },
  { table: 'marketing_meta_ads_daily', classification: 'set_null' },
  { table: 'marketing_meta_adsets_daily', classification: 'set_null' },
  { table: 'website_lifecycle_events', classification: 'set_null' },
  { table: 'website_prospects', classification: 'set_null' },

  { table: 'payments', classification: 'cascade', note: 'Financial; appointment_id is NO ACTION — delete payments before appointments cascade' },
  { table: 'payment_audit_logs', classification: 'financial_child' },
  { table: 'appointments', classification: 'cascade' },
  { table: 'invoices', classification: 'cascade' },
  { table: 'invoice_items', classification: 'cascade' },
  { table: 'invoice_payments', classification: 'cascade' },
  { table: 'student_credits', classification: 'cascade' },
  { table: 'credit_transactions', classification: 'cascade' },

  // High-volume / common cascade children (preview counts)
  { table: 'users', classification: 'cascade' },
  { table: 'tenant_settings', classification: 'cascade' },
  { table: 'locations', classification: 'cascade' },
  { table: 'event_types', classification: 'cascade' },
  { table: 'categories', classification: 'cascade' },
  { table: 'cancellation_policies', classification: 'cascade' },
  { table: 'cancellation_reasons', classification: 'cascade' },
  { table: 'cancellation_rules', classification: 'cascade' },
  { table: 'evaluation_categories', classification: 'cascade' },
  { table: 'evaluation_criteria', classification: 'cascade' },
  { table: 'evaluation_scale', classification: 'cascade' },
  { table: 'staff_working_hours', classification: 'cascade' },
  { table: 'staff_locations', classification: 'cascade' },
  { table: 'staff_monthly_hours', classification: 'cascade' },
  { table: 'staff_invitations', classification: 'cascade' },
  { table: 'staff_working_hour_exceptions', classification: 'cascade' },
  { table: 'staff_year_carry_over', classification: 'cascade' },
  { table: 'external_calendars', classification: 'cascade' },
  { table: 'external_busy_times', classification: 'cascade' },
  { table: 'availability_slots', classification: 'cascade' },
  { table: 'availability_recalc_queue', classification: 'cascade' },
  { table: 'booking_proposals', classification: 'cascade' },
  { table: 'pricing_rules', classification: 'cascade' },
  { table: 'cash_registers', classification: 'cascade' },
  { table: 'cash_balances', classification: 'cascade' },
  { table: 'cash_movements', classification: 'cascade' },
  { table: 'cash_transactions', classification: 'cascade' },
  { table: 'accounting_accounts', classification: 'cascade' },
  { table: 'accounting_categories', classification: 'cascade' },
  { table: 'accounting_entries', classification: 'cascade' },
  { table: 'accounting_journal_lines', classification: 'cascade' },
  { table: 'platform_referral_codes', classification: 'cascade' },
  { table: 'website_tenants', classification: 'cascade' },
  { table: 'admin_notifications', classification: 'cascade' },
  { table: 'audit_logs', classification: 'cascade' },
  { table: 'error_logs', classification: 'cascade' },
  { table: 'rate_limit_logs', classification: 'cascade' },
  { table: 'outbound_messages_queue', classification: 'cascade' },
  { table: 'sms_logs', classification: 'cascade' },
  { table: 'notes', classification: 'cascade' },
  { table: 'tenant_secrets', classification: 'cascade' },
  { table: 'tenant_assets', classification: 'cascade' },
  { table: 'products', classification: 'cascade' },
  { table: 'product_sales', classification: 'cascade' },
  { table: 'discounts', classification: 'cascade' },
  { table: 'courses', classification: 'cascade' },
  { table: 'course_sessions', classification: 'cascade' },
  { table: 'course_registrations', classification: 'cascade' },
  { table: 'course_categories', classification: 'cascade' },
  { table: 'course_waitlist', classification: 'cascade' },
  { table: 'vehicles', classification: 'cascade' },
  { table: 'rooms', classification: 'cascade' },
  { table: 'user_documents', classification: 'cascade' },
  { table: 'customer_payment_methods', classification: 'cascade' },
  { table: 'impersonation_sessions', classification: 'cascade' },
  { table: 'sari_sync_logs', classification: 'cascade' },
  { table: 'sari_customer_mapping', classification: 'cascade' },
  { table: 'sari_course_mapping', classification: 'cascade' },
  { table: 'push_tokens', classification: 'cascade' },
  { table: 'correspondence', classification: 'cascade' },
  { table: 'correspondence_messages', classification: 'cascade' },
  { table: 'email_accounts', classification: 'cascade' },
  { table: 'email_messages', classification: 'cascade' },
  { table: 'email_knowledge', classification: 'cascade' },
  { table: 'gbp_locations', classification: 'cascade' },
  { table: 'gbp_media_assets', classification: 'cascade' },
  { table: 'gbp_insights_daily', classification: 'cascade' },
  { table: 'gbp_post_calendar', classification: 'cascade' },
  { table: 'tenant_google_connections', classification: 'cascade' },
  { table: 'website_revisions', classification: 'cascade' },
]

/** Unique table names for head-count preview (tenant_id column). */
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
