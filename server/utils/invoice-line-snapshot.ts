/**
 * Invoice line labels are frozen at creation from the tenant event type name.
 * PDF and email must not re-read the live appointment to rename a line.
 */

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
 * Cancellation text stays after the name. Course lines do not use this.
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

/**
 * PDF/email/preview presentation of a stored line.
 * Staff and customer text come only from snapshot columns.
 * Live appointment and live user records are not inputs.
 * Old rows without those columns keep product_name and omit the customer line.
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
  const serviceLine = !opts.productId && String(opts.eventTypeCode || '').trim()
  if (!serviceLine) {
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

type EventTypeQuery = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        in: (column: string, values: string[]) => Promise<{ data: Array<{ code: string; name: string | null }> | null }>
      }
    }
  }
}

/** Exact tenant event-type names. No fuzzy aliases. */
export async function loadTenantEventTypeNames(
  supabase: EventTypeQuery,
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
