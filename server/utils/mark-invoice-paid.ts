/**
 * Mark-invoice-paid domain rules.
 *
 * Distinguishes bank-verified settlement (CAMT/CSV dedupe) from explicit
 * admin manual attestation. Never invents cash_transactions or treats a
 * provider-like method as technically verified solely because a form was submitted.
 */

export type MarkInvoicePaidSettlementSource = 'bank_import' | 'manual_attestation'

export type MarkInvoicePaidRole = 'admin' | 'tenant_admin' | string

export class MarkInvoicePaidError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'MarkInvoicePaidError'
  }
}

/** Methods that imply a payment provider / online channel — not attest-able as “Bar”. */
const PROVIDER_METHOD_RE =
  /^(wallee|stripe|paypal|online|online_payment|card_online|credit_card_online|provider)$/i

const OFFLINE_METHOD_HINT_RE =
  /^(bar|cash|cash_on_site|manual|bank_transfer|bank|twint|ueberweisung|überweisung|paid)$/i

export function assertMarkInvoicePaidRole(role: string | null | undefined): void {
  if (!role || !['admin', 'tenant_admin'].includes(role)) {
    throw new MarkInvoicePaidError(403, 'Nur Admins dürfen Rechnungen als bezahlt markieren')
  }
}

export function normalizePaymentMethodLabel(
  paymentMethod: unknown,
  note: unknown,
): string {
  const raw = String(paymentMethod || note || 'manual').trim()
  return raw.length > 0 ? raw : 'manual'
}

export function isProviderLikePaymentMethod(method: string): boolean {
  const normalized = method.trim().toLowerCase().replace(/\s+/g, '_')
  return PROVIDER_METHOD_RE.test(normalized)
}

export function looksLikeOfflinePaymentMethod(method: string): boolean {
  const normalized = method.trim().toLowerCase().replace(/\s+/g, '_')
  if (OFFLINE_METHOD_HINT_RE.test(normalized)) return true
  // Free-text offline notes (e.g. "Bar Kursabend") — still require attestation
  if (PROVIDER_METHOD_RE.test(normalized)) return false
  return true
}

export function resolveSettlementSource(input: {
  camtDedupeKey?: string | null
  manualPaymentAttested?: boolean | null
  paymentMethod: string
}): { source: MarkInvoicePaidSettlementSource; technicallyVerified: boolean } {
  const dedupe = typeof input.camtDedupeKey === 'string' ? input.camtDedupeKey.trim() : ''
  if (dedupe) {
    return { source: 'bank_import', technicallyVerified: true }
  }

  if (isProviderLikePaymentMethod(input.paymentMethod)) {
    throw new MarkInvoicePaidError(
      422,
      'Online-/Provider-Zahlungen (z.B. Wallee) können hier nicht manuell als erfolgreich bestätigt werden. Bitte Bankimport oder den Provider-Workflow verwenden.',
    )
  }

  if (input.manualPaymentAttested !== true) {
    throw new MarkInvoicePaidError(
      422,
      'Manuelle Zahlungsbestätigung erfordert die ausdrückliche Bestätigung, dass der Zahlungseingang geprüft wurde (keine technische Verifikation).',
    )
  }

  if (!looksLikeOfflinePaymentMethod(input.paymentMethod)) {
    throw new MarkInvoicePaidError(
      422,
      'Diese Zahlungsart ist für eine manuelle Bestätigung nicht zulässig.',
    )
  }

  return { source: 'manual_attestation', technicallyVerified: false }
}

export function computePaidTotals(input: {
  invoiceTotalRappen: number
  previouslyPaidRappen: number
  requestedPaymentRappen: number | null | undefined
}): {
  newPaymentRappen: number
  clampedTotalRappen: number
  isPartial: boolean
} {
  const total = Math.max(0, Math.trunc(Number(input.invoiceTotalRappen) || 0))
  const previously = Math.max(0, Math.trunc(Number(input.previouslyPaidRappen) || 0))
  const requestedRaw = input.requestedPaymentRappen
  const requested =
    requestedRaw == null || requestedRaw === undefined
      ? Math.max(0, total - previously)
      : Math.trunc(Number(requestedRaw) || 0)

  if (requested <= 0) {
    throw new MarkInvoicePaidError(400, 'Zahlungsbetrag muss grösser als 0 sein')
  }
  if (previously >= total && total > 0) {
    throw new MarkInvoicePaidError(409, 'Rechnung ist bereits vollständig bezahlt')
  }

  const remaining = Math.max(0, total - previously)
  const newPaymentRappen = Math.min(requested, remaining)
  const clampedTotalRappen = Math.min(total, previously + newPaymentRappen)
  const isPartial = clampedTotalRappen < total
  return { newPaymentRappen, clampedTotalRappen, isPartial }
}

export type CourseRegistrationPaySyncPlan =
  | { action: 'none'; reason: 'partial' | 'no_registration' }
  | {
      action: 'sync'
      registrationId: string
      amountPaidRappen: number
      paymentStatus: 'paid'
    }

/**
 * Exactly one tenant-scoped registration linked by invoice_id may be synced.
 * Zero is OK (lesson-only invoices). More than one is fail-closed.
 */
export function planCourseRegistrationPaySync(input: {
  isPartial: boolean
  clampedTotalRappen: number
  registrations: Array<{ id: string; tenant_id: string; invoice_id: string | null }>
  tenantId: string
  invoiceId: string
}): CourseRegistrationPaySyncPlan {
  if (input.isPartial) {
    return { action: 'none', reason: 'partial' }
  }

  const linked = input.registrations.filter(
    (r) =>
      r.invoice_id === input.invoiceId &&
      r.tenant_id === input.tenantId &&
      typeof r.id === 'string' &&
      r.id.length > 0,
  )

  if (linked.length === 0) {
    return { action: 'none', reason: 'no_registration' }
  }
  if (linked.length > 1) {
    throw new MarkInvoicePaidError(
      409,
      'Mehrere Kursanmeldungen sind mit dieser Rechnung verknüpft — automatische Zahlungssynchronisation abgebrochen.',
    )
  }

  return {
    action: 'sync',
    registrationId: linked[0].id,
    amountPaidRappen: Math.max(0, Math.trunc(input.clampedTotalRappen)),
    paymentStatus: 'paid',
  }
}

export function buildMarkInvoicePaidAuditDetails(input: {
  settlementSource: MarkInvoicePaidSettlementSource
  technicallyVerified: boolean
  paymentMethod: string
  newPaymentRappen: number
  clampedTotalRappen: number
  isPartial: boolean
  courseRegistrationId: string | null
  importSource?: string | null
}): Record<string, unknown> {
  return {
    settlement_source: input.settlementSource,
    technically_verified: input.technicallyVerified,
    payment_method: input.paymentMethod,
    new_payment_rappen: input.newPaymentRappen,
    paid_amount_rappen: input.clampedTotalRappen,
    is_partial: input.isPartial,
    course_registration_id: input.courseRegistrationId,
    import_source: input.importSource || null,
    // Explicit: manual attestation is not independent settlement proof
    cash_ledger_written: false,
  }
}
