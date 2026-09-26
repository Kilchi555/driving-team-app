/**
 * Columns the public website renderer actually reads from `tenants`.
 *
 * The SQL select is this list. Secrets are never selected.
 * The JSON response is a further subset: server-only fields stay on the server.
 *
 * Production schema (information_schema, column names only) was used to drop
 * fields that do not exist on `tenants` (city, phone, email, latitude, SARI, …).
 */

/** Returned to the browser. Every key must stay on this list. */
export const PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS = [
  'name',
  'business_type',
  'slug',
  'address',
  'invoice_zip',
  'invoice_city',
  'contact_phone',
  'contact_email',
  'whatsapp_phone',
  'working_days_template',
  'facebook_url',
  'instagram_url',
  'social_facebook',
  'social_instagram',
  'social_linkedin',
  'social_twitter',
  'logo_url',
  'legal_company_name',
  'uid_number',
  'website_url',
] as const

/**
 * Also loaded for server-side enrichment (team, hours, website-only conversion).
 * Never copied into the public JSON.
 */
export const PUBLIC_WEBSITE_TENANT_SERVER_FIELDS = [
  'id',
  'website_only',
  'booking_policy',
  'minimum_booking_lead_time_hours',
] as const

export const PUBLIC_WEBSITE_TENANT_SELECT_FIELDS = [
  ...PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS,
  ...PUBLIC_WEBSITE_TENANT_SERVER_FIELDS,
] as const

export const PUBLIC_WEBSITE_TENANT_SELECT = PUBLIC_WEBSITE_TENANT_SELECT_FIELDS.join(',')

const RESPONSE_FIELD_SET = new Set<string>(PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS)

export function asPublicTenantRow(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null
  return row as Record<string, unknown>
}

export function projectPublicWebsiteTenant(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null
  const out: Record<string, unknown> = {}
  for (const key of PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) out[key] = row[key]
  }
  return out
}

export function isPublicWebsiteTenantResponseKey(key: string): boolean {
  return RESPONSE_FIELD_SET.has(key)
}
