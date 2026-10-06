/**
 * Invoice line labels are frozen at creation from the tenant event type name
 * plus snapshotted staff/customer names.
 * PDF, email, preview, download, resend, and by-payment must not re-read the
 * live appointment or live user record to rename a stored service line.
 */

import { buildInvoiceServiceLineLabel } from '~/server/utils/invoice-line-labels'

export const GENERIC_INVOICE_LINE_LABEL = 'Leistung'

const GENERIC_TITLES = new Set(['fahrstunde', 'fahrstunden', 'termin', 'leistung'])

export function resolveInvoiceLineLabel(opts: {
  eventTypeName?: string | null
  existingTitle?: string | null
}): string {
  const eventTypeName = String(opts.eventTypeName || '').trim()
  if (eventTypeName) return eventTypeName

  const title = String(opts.existingTitle || '').trim()
  if (title && !GENERIC_TITLES.has(title.toLowerCase())) return title

  return GENERIC_INVOICE_LINE_LABEL
}

/**
 * Line 1 for an appointment service: event label plus the frozen staff first name.
 * Cancellation text stays after the name. Course/product lines do not use this.
 */
export function formatStaffInvoiceLineTitle(opts: {
  productName?: string | null
  staffFirstName?: string | null
}): string {
  const base = String(opts.productName || '').trim() || GENERIC_INVOICE_LINE_LABEL
  const staff = String(opts.staffFirstName || '').trim()
  if (!staff) return base
  const withStaff = ` mit ${staff}`
  if (base.includes(withStaff)) return base
  const cancelled = base.match(/^(.*?)( \(abgesagt.*\))$/)
  if (cancelled) return `${cancelled[1]}${withStaff}${cancelled[2]}`
  return `${base}${withStaff}`
}

/** Line 2. Empty when the customer name was not snapshotted. */
export function formatCustomerInvoiceLine(opts: {
  customerFirstName?: string | null
  customerLastName?: string | null
}): string | null {
  const name = [opts.customerFirstName, opts.customerLastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
  return name ? `Kunde: ${name}` : null
}

export function invoiceLineBreakdownLabel(productName?: string | null): string {
  const name = String(productName || '').trim()
  return name || GENERIC_INVOICE_LINE_LABEL
}

/** True when this row carries immutable service-line presentation fields. */
export function hasServiceLineSnapshot(opts: {
  productId?: string | null
  eventTypeCode?: string | null
  staffFirstName?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
}): boolean {
  if (opts.productId) return false
  return Boolean(
    String(opts.eventTypeCode || '').trim()
    || String(opts.staffFirstName || '').trim()
    || String(opts.customerFirstName || '').trim()
    || String(opts.customerLastName || '').trim()
  )
}

/**
 * PDF/email/preview presentation of a stored line.
 * Staff and customer text come only from snapshot columns.
 * Live appointment and live user records are not inputs.
 * Historical rows without snapshot columns keep product_name and omit customer_line.
 */
export function presentStoredInvoiceLine(opts: {
  productName?: string | null
  productId?: string | null
  eventTypeCode?: string | null
  staffFirstName?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
}): { product_name: string; breakdown_label: string; customer_line: string | null } {
  const stored = String(opts.productName || '').trim()
  const breakdown_label = invoiceLineBreakdownLabel(stored)

  if (opts.productId || !hasServiceLineSnapshot(opts)) {
    return {
      product_name: stored || GENERIC_INVOICE_LINE_LABEL,
      breakdown_label,
      customer_line: null,
    }
  }

  return {
    product_name: formatStaffInvoiceLineTitle({
      productName: stored,
      staffFirstName: opts.staffFirstName,
    }),
    breakdown_label,
    customer_line: formatCustomerInvoiceLine({
      customerFirstName: opts.customerFirstName,
      customerLastName: opts.customerLastName,
    }),
  }
}

export type InvoiceLineSnapshotFields = {
  event_type_code: string | null
  user_id: string | null
  staff_id: string | null
  staff_first_name: string | null
  customer_first_name: string | null
  customer_last_name: string | null
  product_name: string
}

/**
 * Build immutable service-line fields from already tenant-scoped appointment/party data.
 * Callers must never pass client-supplied snapshot values.
 */
export function buildServiceLineSnapshot(opts: {
  eventTypeCode?: string | null
  eventTypeName?: string | null
  existingTitle?: string | null
  fallbackLabel?: string | null
  appointmentStatus?: string | null
  cancellationChargePercentage?: number | null
  snapshotUserId?: string | null
  staffId?: string | null
  staffFirstName?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
}): InvoiceLineSnapshotFields {
  const eventTypeCode = String(opts.eventTypeCode || '').trim() || null
  const eventLabel = resolveInvoiceLineLabel({
    eventTypeName: opts.eventTypeName,
    existingTitle: opts.existingTitle || opts.fallbackLabel,
  })
  const product_name = buildInvoiceServiceLineLabel({
    eventLabel,
    title: opts.existingTitle,
    fallback: opts.fallbackLabel || GENERIC_INVOICE_LINE_LABEL,
    staffFirstName: null,
    appointmentStatus: opts.appointmentStatus,
    cancellationChargePercentage: opts.cancellationChargePercentage,
  })

  if (!eventTypeCode) {
    return {
      event_type_code: null,
      user_id: opts.snapshotUserId || null,
      staff_id: null,
      staff_first_name: null,
      customer_first_name: null,
      customer_last_name: null,
      product_name,
    }
  }

  return {
    event_type_code: eventTypeCode,
    user_id: opts.snapshotUserId || null,
    staff_id: opts.staffId || null,
    staff_first_name: String(opts.staffFirstName || '').trim() || null,
    customer_first_name: String(opts.customerFirstName || '').trim() || null,
    customer_last_name: String(opts.customerLastName || '').trim() || null,
    product_name,
  }
}

/** Exact tenant event-type names. No fuzzy aliases. */
export async function loadTenantEventTypeNames(
  supabase: { from: (table: string) => any },
  tenantId: string,
  codes: Array<string | null | undefined>,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(codes.map((code) => String(code || '').trim()).filter(Boolean)))
  if (!tenantId || unique.length === 0) return {}
  const { data } = await supabase
    .from('event_types')
    .select('code, name')
    .eq('tenant_id', tenantId)
    .in('code', unique)
  const map: Record<string, string> = {}
  for (const row of data || []) {
    const name = String(row.name || '').trim()
    if (row.code && name) map[row.code] = name
  }
  return map
}
