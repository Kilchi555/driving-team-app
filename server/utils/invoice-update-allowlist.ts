import { isPlaceholderBillingEmail } from '~/server/utils/invoice-billing-snapshot'

/**
 * Allowlist for POST /api/invoices/update.
 *
 * Callers and the fields they send:
 * - composables/useInvoices.ts markInvoiceAsSent / sendInvoice: status, sent_at
 * - composables/useInvoices.ts cancelInvoice: status, notes
 * - components/InvoicePreviewModal.vue saveViewBilling: billing address fields.
 *   The preview editor also sends billing_street_number, including '' to clear it,
 *   and resubmits the current billing_email.
 *
 * Payment state, totals, ownership, and dunning are not updated here.
 * Those mutations belong to dedicated settlement, credit, or dunning paths.
 * A forbidden key rejects the whole request so nothing is written.
 */

export const INVOICE_UPDATE_ALLOWED_FIELDS = [
  'status',
  'sent_at',
  'notes',
  'billing_company_name',
  'billing_contact_person',
  'billing_street',
  'billing_street_number',
  'billing_zip',
  'billing_city',
  'billing_email',
] as const

export type InvoiceUpdateAllowedField = (typeof INVOICE_UPDATE_ALLOWED_FIELDS)[number]

const ALLOWED = new Set<string>(INVOICE_UPDATE_ALLOWED_FIELDS)

/** Status values this endpoint already applies for send and cancel. */
const ALLOWED_STATUSES = new Set(['sent', 'cancelled'])

const STRING_LIMITS: Record<Exclude<InvoiceUpdateAllowedField, 'status' | 'sent_at'>, number> = {
  notes: 20_000,
  billing_company_name: 255,
  billing_contact_person: 255,
  billing_street: 255,
  billing_street_number: 20,
  billing_zip: 20,
  billing_city: 100,
  billing_email: 255,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InvoiceUpdateDecision =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; statusCode: 400; statusMessage: string; rejectedFields: string[] }

export function decideInvoiceUpdate(
  updates: unknown,
  updatedAt: string,
  storedBillingEmail?: string | null,
): InvoiceUpdateDecision {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return reject([], 'updates must be an object')
  }

  const record = updates as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length === 0) {
    return reject([], 'No invoice fields to update')
  }

  const rejectedFields = keys.filter((key) => !ALLOWED.has(key))
  if (rejectedFields.length > 0) {
    return reject(
      rejectedFields,
      `Cannot update protected or unsupported invoice fields: ${rejectedFields.join(', ')}`,
    )
  }

  const payload: Record<string, unknown> = { updated_at: updatedAt }

  for (const key of keys) {
    const value = record[key]
    if (value === undefined) continue

    const validated = validateAllowedField(key as InvoiceUpdateAllowedField, value, storedBillingEmail)
    if (!validated.ok) return validated
    payload[key] = validated.value
  }

  if (Object.keys(payload).length === 1) {
    return reject([], 'No invoice fields to update')
  }

  return { ok: true, payload }
}

function validateAllowedField(
  key: InvoiceUpdateAllowedField,
  value: unknown,
  storedBillingEmail?: string | null,
): { ok: true; value: unknown } | InvoiceUpdateDecision {
  if (key === 'status') {
    if (typeof value !== 'string' || !ALLOWED_STATUSES.has(value)) {
      return reject(['status'], 'status must be sent or cancelled')
    }
    return { ok: true, value }
  }

  if (key === 'sent_at') {
    if (typeof value !== 'string' || !isIsoTimestamp(value)) {
      return reject(['sent_at'], 'sent_at must be an ISO timestamp')
    }
    return { ok: true, value }
  }

  const limit = STRING_LIMITS[key]
  if (value === null) return { ok: true, value: null }
  if (typeof value !== 'string') {
    return reject([key], `${key} must be a string or null`)
  }
  if (value.length > limit) {
    return reject([key], `${key} is too long`)
  }
  if (key === 'billing_email') return validateBillingEmail(value, storedBillingEmail)
  return { ok: true, value }
}

/**
 * A real address must match EMAIL_PATTERN. Exact '' stays rejected; callers send null to clear.
 * isPlaceholderBillingEmail is the only recognized legacy set (whitespace-only, or "keine e-mail"
 * in any case). Such a value is accepted only when it is exactly the email already stored, so the
 * preview can resubmit it. A new malformed string, including a placeholder that is not already
 * stored, is still rejected.
 */
function validateBillingEmail(
  value: string,
  storedBillingEmail?: string | null,
): { ok: true; value: string } | InvoiceUpdateDecision {
  if (value === '') {
    return reject(['billing_email'], 'billing_email must be an email address or null')
  }
  if (isPlaceholderBillingEmail(value)) {
    if (value === storedBillingEmail) return { ok: true, value }
    return reject(['billing_email'], 'billing_email must be an email address or null')
  }
  if (!EMAIL_PATTERN.test(value)) {
    return reject(['billing_email'], 'billing_email must be an email address or null')
  }
  return { ok: true, value }
}

function isIsoTimestamp(value: string): boolean {
  if (value.length < 10 || value.length > 40) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed)
}

function reject(rejectedFields: string[], statusMessage: string): InvoiceUpdateDecision {
  return { ok: false, statusCode: 400, statusMessage, rejectedFields }
}
