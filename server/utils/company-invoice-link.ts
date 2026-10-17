import { flattenCompanyName } from '~/utils/billing-address-map'

/**
 * Decision rules for linking a historical company invoice.
 *
 * A link writes only invoices.company_id. Existing BEFORE UPDATE triggers on
 * invoices recompute totals and can move status/payment_status, so a row is
 * linkable only when those triggers would leave money and payment status
 * unchanged. Current membership and billing-name matches are suggestions.
 */

export const COMPANY_INVOICE_LINK_ROLES = ['admin', 'staff', 'super_admin', 'superadmin'] as const

export const LINK_BLOCKED_MESSAGE =
  'Zuordnung blockiert: ein bestehender Datenbank-Trigger würde Betrag oder Zahlungsstatus ändern.'
export const ALREADY_LINKED_MESSAGE = 'Rechnung ist bereits einer Firma zugeordnet.'
export const CONCURRENT_CHANGE_MESSAGE = 'Rechnung wurde inzwischen geändert. Bitte neu laden.'
export const NOT_CANDIDATE_MESSAGE = 'Nur nicht zugeordnete Firmenrechnungen können verknüpft werden.'
export const CONFIRM_REQUIRED_MESSAGE = 'Die Zuordnung muss ausdrücklich bestätigt werden.'
export const COMPANY_NOT_FOUND_MESSAGE = 'Firma nicht gefunden'
export const INVOICE_NOT_FOUND_MESSAGE = 'Rechnung nicht gefunden'
export const AUDIT_FAILED_MESSAGE = 'Zuordnung wurde nicht gespeichert, weil das Audit-Log fehlgeschlagen ist.'
export const TRIGGER_CHANGED_MESSAGE =
  'Zuordnung wurde zurückgenommen, weil Betrag oder Zahlungsstatus sich geändert hätte.'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LINK_BODY_KEYS = ['invoice_id', 'company_id', 'expected_updated_at', 'confirm'] as const

export const UNLINKED_LIST_LIMIT = 200
export const SUGGESTION_COMPANY_LIMIT = 2000

export const INVOICE_LINK_READ_COLUMNS = [
  'id',
  'tenant_id',
  'company_id',
  'user_id',
  'document_kind',
  'billing_type',
  'billing_company_name',
  'billing_city',
  'billing_zip',
  'invoice_number',
  'invoice_date',
  'created_at',
  'updated_at',
  'due_date',
  'status',
  'payment_status',
  'subtotal_rappen',
  'vat_rate',
  'vat_amount_rappen',
  'discount_amount_rappen',
  'total_amount_rappen',
  'paid_amount_rappen',
].join(', ')

export const INVOICE_LINK_VERIFY_COLUMNS = [
  'id',
  'company_id',
  'status',
  'payment_status',
  'subtotal_rappen',
  'vat_amount_rappen',
  'discount_amount_rappen',
  'total_amount_rappen',
  'paid_amount_rappen',
].join(', ')

export type SuggestionSource = 'current_membership' | 'exact_billing_name'

export type CompanyLinkSuggestion = {
  company_id: string
  company_name: string
  company_created_at: string | null
  invoice_predates_company: boolean
  sources: SuggestionSource[]
  authoritative: false
}

export type LinkableInvoiceRow = {
  id: string
  tenant_id: string | null
  company_id: string | null
  user_id?: string | null
  document_kind: string | null
  billing_type: string | null
  billing_company_name?: string | null
  billing_city?: string | null
  billing_zip?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  created_at?: string | null
  updated_at?: string | null
  due_date?: string | null
  status?: string | null
  payment_status?: string | null
  subtotal_rappen?: number | string | null
  vat_rate?: number | string | null
  vat_amount_rappen?: number | string | null
  discount_amount_rappen?: number | string | null
  total_amount_rappen?: number | string | null
  paid_amount_rappen?: number | string | null
}

export type ParsedLinkBody = {
  invoiceId: string
  companyId: string
  expectedUpdatedAt: string
}

export type LinkRefusal = {
  statusCode: 400 | 404 | 409
  message: string
}

export function utcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function parseCompanyInvoiceLinkBody(body: unknown): { ok: true; value: ParsedLinkBody } | { ok: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Ungültige Anfrage' }
  }
  const record = body as Record<string, unknown>
  const extra = Object.keys(record).filter((key) => !LINK_BODY_KEYS.includes(key as (typeof LINK_BODY_KEYS)[number]))
  if (extra.length > 0) {
    return { ok: false, message: 'Die Anfrage darf nur Rechnung, Firma und Bestätigung enthalten.' }
  }
  if (record.confirm !== true) return { ok: false, message: CONFIRM_REQUIRED_MESSAGE }
  const invoiceId = typeof record.invoice_id === 'string' ? record.invoice_id.trim() : ''
  const companyId = typeof record.company_id === 'string' ? record.company_id.trim() : ''
  const expectedUpdatedAt = typeof record.expected_updated_at === 'string' ? record.expected_updated_at : ''
  if (!UUID_RE.test(invoiceId) || !UUID_RE.test(companyId)) {
    return { ok: false, message: 'Ungültige Rechnungs- oder Firmen-ID' }
  }
  if (!expectedUpdatedAt) return { ok: false, message: CONCURRENT_CHANGE_MESSAGE }
  return { ok: true, value: { invoiceId, companyId, expectedUpdatedAt } }
}

function integerAmount(value: unknown): bigint | null {
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value)
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value)
  return null
}

function parseDecimal(value: unknown): { scaled: bigint; scale: number } | null {
  const text = typeof value === 'number'
    ? (Number.isFinite(value) ? String(value) : '')
    : typeof value === 'string'
      ? value.trim()
      : ''
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  const negative = text.startsWith('-')
  const [whole, frac = ''] = text.replace('-', '').split('.')
  const scale = frac.length
  const scaled = BigInt(`${whole}${frac}` || '0')
  return { scaled: negative ? -scaled : scaled, scale }
}

function divRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  const quotient = absolute / denominator
  const remainder = absolute % denominator
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient
  return negative ? -rounded : rounded
}

/** Matches public.calculate_invoice_vat: ROUND((subtotal * vat_rate / 100)::numeric). */
export function roundedVatRappen(subtotalRappen: unknown, vatRate: unknown): number | null {
  const subtotal = integerAmount(subtotalRappen)
  const rate = parseDecimal(vatRate)
  if (subtotal == null || rate == null) return null
  const numerator = subtotal * rate.scaled
  const denominator = 100n * 10n ** BigInt(rate.scale)
  const rounded = divRoundHalfAwayFromZero(numerator, denominator)
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER) || rounded < BigInt(Number.MIN_SAFE_INTEGER)) return null
  return Number(rounded)
}

export function invoiceTriggerWouldChangeAmounts(row: LinkableInvoiceRow): boolean {
  const vat = roundedVatRappen(row.subtotal_rappen, row.vat_rate)
  const subtotal = integerAmount(row.subtotal_rappen)
  const discount = integerAmount(row.discount_amount_rappen)
  const storedVat = integerAmount(row.vat_amount_rappen)
  const storedTotal = integerAmount(row.total_amount_rappen)
  if (vat == null || subtotal == null || discount == null || storedVat == null || storedTotal == null) return true
  const total = subtotal + BigInt(vat) - discount
  return BigInt(vat) !== storedVat || total !== storedTotal
}

export function invoiceTriggerWouldChangeStatus(row: LinkableInvoiceRow, asOfDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return true
  const due = typeof row.due_date === 'string' ? row.due_date.slice(0, 10) : ''
  const payment = row.payment_status || ''
  const paid = integerAmount(row.paid_amount_rappen)
  const total = integerAmount(row.total_amount_rappen)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || paid == null || total == null) return true
  if (due < asOfDate && row.status === 'sent' && payment !== 'paid') return true
  if (paid >= total && payment !== 'paid') return true
  return false
}

export function assessCompanyInvoiceLink(
  invoice: LinkableInvoiceRow,
  expectedUpdatedAt: string,
  asOfDate: string,
): { ok: true } | { ok: false; refusal: LinkRefusal } {
  if (invoice.company_id) {
    return { ok: false, refusal: { statusCode: 409, message: ALREADY_LINKED_MESSAGE } }
  }
  if (invoice.document_kind !== 'invoice' || invoice.billing_type !== 'company') {
    return { ok: false, refusal: { statusCode: 409, message: NOT_CANDIDATE_MESSAGE } }
  }
  if (invoice.updated_at !== expectedUpdatedAt) {
    return { ok: false, refusal: { statusCode: 409, message: CONCURRENT_CHANGE_MESSAGE } }
  }
  if (invoiceTriggerWouldChangeAmounts(invoice) || invoiceTriggerWouldChangeStatus(invoice, asOfDate)) {
    return { ok: false, refusal: { statusCode: 409, message: LINK_BLOCKED_MESSAGE } }
  }
  return { ok: true }
}

export function preservedInvoiceFields(row: LinkableInvoiceRow): Record<string, unknown> {
  return {
    status: row.status ?? null,
    payment_status: row.payment_status ?? null,
    subtotal_rappen: integerAmount(row.subtotal_rappen)?.toString() ?? null,
    vat_amount_rappen: integerAmount(row.vat_amount_rappen)?.toString() ?? null,
    discount_amount_rappen: integerAmount(row.discount_amount_rappen)?.toString() ?? null,
    total_amount_rappen: integerAmount(row.total_amount_rappen)?.toString() ?? null,
    paid_amount_rappen: integerAmount(row.paid_amount_rappen)?.toString() ?? null,
  }
}

export function invoicePreservationMatches(before: LinkableInvoiceRow, after: LinkableInvoiceRow): boolean {
  const left = preservedInvoiceFields(before)
  const right = preservedInvoiceFields(after)
  return Object.keys(left).every((key) => left[key] === right[key])
}

export function buildCompanyLinkAuditDetails(invoiceId: string, companyId: string | null, previousCompanyId: string | null) {
  return {
    invoice_id: invoiceId,
    previous_company_id: previousCompanyId,
    new_company_id: companyId,
  }
}

function normalizedName(value: string | null | undefined): string {
  return flattenCompanyName(value).toLowerCase()
}

export function buildCompanyLinkSuggestions(input: {
  billingCompanyName: string | null | undefined
  invoiceCreatedAt: string | null | undefined
  membershipCompanyId: string | null | undefined
  companies: Array<{ id: string; name: string; created_at?: string | null }>
}): CompanyLinkSuggestion[] {
  const byId = new Map<string, CompanyLinkSuggestion>()
  const invoiceCreated = input.invoiceCreatedAt ? Date.parse(input.invoiceCreatedAt) : NaN

  const add = (company: { id: string; name: string; created_at?: string | null }, source: SuggestionSource) => {
    const existing = byId.get(company.id)
    const companyCreated = company.created_at ? Date.parse(company.created_at) : NaN
    const predates = Number.isFinite(invoiceCreated) && Number.isFinite(companyCreated) && invoiceCreated < companyCreated
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source)
      return
    }
    byId.set(company.id, {
      company_id: company.id,
      company_name: company.name,
      company_created_at: company.created_at || null,
      invoice_predates_company: predates,
      sources: [source],
      authoritative: false,
    })
  }

  const membership = input.companies.find((company) => company.id === input.membershipCompanyId)
  if (membership) add(membership, 'current_membership')

  const billingName = normalizedName(input.billingCompanyName)
  if (billingName) {
    for (const company of input.companies) {
      if (normalizedName(company.name) === billingName) add(company, 'exact_billing_name')
    }
  }

  return [...byId.values()]
}
