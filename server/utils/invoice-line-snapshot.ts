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
 * Company invoices identify the student on service lines.
 * The stored product_name stays the event label. Course lines (no event type)
 * keep their existing participant text and are not rewritten here.
 */
export function formatInvoiceLineTitle(opts: {
  productName?: string | null
  billingType?: string | null
  studentName?: string | null
  eventTypeCode?: string | null
}): string {
  const base = String(opts.productName || '').trim() || GENERIC_INVOICE_LINE_LABEL
  if (opts.billingType !== 'company') return base
  if (!String(opts.eventTypeCode || '').trim()) return base
  const student = String(opts.studentName || '').trim()
  if (!student) return base
  return `${base} – ${student}`
}

export function invoiceLineBreakdownLabel(productName?: string | null): string {
  const name = String(productName || '').trim()
  return name || GENERIC_INVOICE_LINE_LABEL
}

/**
 * PDF/email presentation of a stored line.
 * product_name may gain the company student suffix. breakdown_label stays the stored name.
 * Live appointment fields are not inputs.
 */
export function presentStoredInvoiceLine(opts: {
  productName?: string | null
  productId?: string | null
  billingType?: string | null
  studentName?: string | null
  eventTypeCode?: string | null
}): { product_name: string; breakdown_label: string } {
  const stored = String(opts.productName || '').trim()
  const breakdown_label = invoiceLineBreakdownLabel(stored)
  if (opts.productId) {
    return { product_name: stored || GENERIC_INVOICE_LINE_LABEL, breakdown_label }
  }
  return {
    product_name: formatInvoiceLineTitle({
      productName: stored,
      billingType: opts.billingType,
      studentName: opts.studentName,
      eventTypeCode: opts.eventTypeCode,
    }),
    breakdown_label,
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
