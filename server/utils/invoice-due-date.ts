/**
 * Compute invoice due date from invoice_date + tenant.invoice_due_days.
 * Defaults to 30 days when the setting is missing/invalid.
 */
export function computeInvoiceDueDate(
  invoiceDate: string | Date | null | undefined,
  dueDays: number | null | undefined
): string {
  const days = Number.isFinite(Number(dueDays)) && Number(dueDays) >= 0
    ? Math.floor(Number(dueDays))
    : 30

  const base = invoiceDate ? new Date(invoiceDate) : new Date()
  // Avoid timezone shifting date-only strings (YYYY-MM-DD) into the previous day
  if (typeof invoiceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    const [y, m, d] = invoiceDate.split('-').map(Number)
    const due = new Date(Date.UTC(y, m - 1, d + days))
    return due.toISOString().slice(0, 10)
  }

  if (Number.isNaN(base.getTime())) {
    const due = new Date()
    due.setDate(due.getDate() + days)
    return due.toISOString().slice(0, 10)
  }

  const due = new Date(base)
  due.setDate(due.getDate() + days)
  return due.toISOString().slice(0, 10)
}

/**
 * Load tenants.invoice_due_days (falls back to 30).
 */
export async function getTenantInvoiceDueDays(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<number> {
  const { data } = await supabase
    .from('tenants')
    .select('invoice_due_days')
    .eq('id', tenantId)
    .maybeSingle()

  const days = Number((data as any)?.invoice_due_days)
  return Number.isFinite(days) && days >= 0 ? Math.floor(days) : 30
}
