/**
 * Shared labels for invoice service lines (lesson / appointment positions).
 */

export type InvoiceServiceAppointment = {
  title?: string | null
  event_type_code?: string | null
  type?: string | null
  status?: string | null
  cancellation_charge_percentage?: number | null
  staff?: { first_name?: string | null } | null
}

export function buildInvoiceServiceLineLabel(opts: {
  eventLabel?: string | null
  title?: string | null
  fallback?: string
  staffFirstName?: string | null
  appointmentStatus?: string | null
  cancellationChargePercentage?: number | null
}): string {
  const base = opts.eventLabel || opts.title || opts.fallback || 'Termin'
  const withStaff = opts.staffFirstName ? `${base} mit ${opts.staffFirstName}` : base

  if (opts.appointmentStatus !== 'cancelled') return withStaff

  const pct = opts.cancellationChargePercentage
  if (typeof pct === 'number' && pct > 0 && pct < 100) {
    return `${withStaff} (abgesagt – ${pct}% verrechnet)`
  }
  return `${withStaff} (abgesagt – verrechnet)`
}

export function buildInvoiceServiceDescription(opts: {
  categoryType?: string | null
  appointmentStatus?: string | null
  existingDescription?: string | null
}): string | null {
  const parts: string[] = []
  if (opts.appointmentStatus === 'cancelled') {
    parts.push('Abgesagt')
  }
  if (opts.categoryType) {
    parts.push(`Kat. ${opts.categoryType}`)
  } else if (opts.existingDescription?.trim()) {
    parts.push(opts.existingDescription.trim())
  }
  return parts.length ? parts.join(' · ') : null
}

/** Convenience: build name + description from appointment + event label map */
export function buildInvoiceServiceLineFromAppointment(
  apt: InvoiceServiceAppointment | null | undefined,
  eventTypeMap: Record<string, string>,
  fallback = 'Termin'
): { product_name: string; product_description: string | null } {
  const eventLabel = apt?.event_type_code
    ? (eventTypeMap[apt.event_type_code] || apt.event_type_code)
    : null
  const staffFirstName = apt?.staff?.first_name || null

  return {
    product_name: buildInvoiceServiceLineLabel({
      eventLabel,
      title: apt?.title,
      fallback,
      staffFirstName,
      appointmentStatus: apt?.status,
      cancellationChargePercentage: apt?.cancellation_charge_percentage,
    }),
    product_description: buildInvoiceServiceDescription({
      categoryType: apt?.type,
      appointmentStatus: apt?.status,
    }),
  }
}
