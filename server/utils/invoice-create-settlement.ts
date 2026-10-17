/**
 * Prepaid invoice line settlement helpers (Contract A–H).
 * Pure validation + payload shaping for create_invoice_with_settlement RPC.
 */

export const OFFLINE_SETTLEMENT_METHODS = [
  'cash',
  'twint',
  'bank_transfer',
  'card_terminal',
] as const

export type OfflineSettlementMethod = (typeof OFFLINE_SETTLEMENT_METHODS)[number]

export const PROVIDER_SETTLEMENT_METHODS = [
  'wallee',
  'online',
  'card',
  'credit_card',
] as const

export function isOfflineSettlementMethod(method: unknown): method is OfflineSettlementMethod {
  return typeof method === 'string'
    && (OFFLINE_SETTLEMENT_METHODS as readonly string[]).includes(method)
}

export function isProviderSettlementMethod(method: unknown): boolean {
  if (typeof method !== 'string') return false
  const m = method.toLowerCase()
  return (PROVIDER_SETTLEMENT_METHODS as readonly string[]).includes(m)
    || m.includes('wallee')
}

export function canRecordInvoiceSettlements(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'tenant_admin'
}

export function canCreateInvoice(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'staff' || role === 'tenant_admin'
}

export interface LineSettlementInput {
  item_index: number
  payment_method: string
  payment_date?: string | null
  amount_rappen?: number | null
  linked_payment_id?: string | null
  notes?: string | null
  /** Must equal line total for v1 (full-line only). */
  line_total_rappen: number
}

export interface ValidatedLineSettlement {
  item_index: number
  payment_method: OfflineSettlementMethod
  payment_date: string
  amount_rappen: number
  linked_payment_id: string | null
  notes: string | null
}

export function validateLineSettlements(
  settlements: LineSettlementInput[] | null | undefined,
  opts: { role: string; itemCount: number },
): ValidatedLineSettlement[] {
  const list = Array.isArray(settlements) ? settlements : []
  if (list.length === 0) return []

  if (!canRecordInvoiceSettlements(opts.role)) {
    throw Object.assign(new Error('Nur Admins dürfen Positionen als bereits bezahlt markieren'), {
      statusCode: 403,
      statusMessage: 'Nur Admins dürfen Positionen als bereits bezahlt markieren',
    })
  }

  const seen = new Set<number>()
  const out: ValidatedLineSettlement[] = []

  for (const raw of list) {
    const idx = Number(raw.item_index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= opts.itemCount) {
      throw Object.assign(new Error('Ungültiger Positionsindex für Zahlung'), {
        statusCode: 400,
        statusMessage: 'Ungültiger Positionsindex für Zahlung',
      })
    }
    if (seen.has(idx)) {
      throw Object.assign(new Error('Doppelte Zahlung für dieselbe Position'), {
        statusCode: 400,
        statusMessage: 'Doppelte Zahlung für dieselbe Position',
      })
    }
    seen.add(idx)

    if (isProviderSettlementMethod(raw.payment_method)) {
      throw Object.assign(new Error('Online-Zahlungen können nicht bei Erstellung als bezahlt markiert werden'), {
        statusCode: 400,
        statusMessage: 'Online-Zahlungen können nicht bei Erstellung als bezahlt markiert werden',
      })
    }
    if (!isOfflineSettlementMethod(raw.payment_method)) {
      throw Object.assign(new Error('Ungültige Zahlungsmethode'), {
        statusCode: 400,
        statusMessage: 'Ungültige Zahlungsmethode',
      })
    }

    const lineTotal = Math.trunc(Number(raw.line_total_rappen) || 0)
    const amount = raw.amount_rappen == null
      ? lineTotal
      : Math.trunc(Number(raw.amount_rappen) || 0)

    if (lineTotal <= 0 || amount !== lineTotal) {
      throw Object.assign(new Error('Nur vollständige Positionszahlungen sind erlaubt'), {
        statusCode: 400,
        statusMessage: 'Nur vollständige Positionszahlungen sind erlaubt',
      })
    }

    const paidAt = raw.payment_date
      ? new Date(raw.payment_date)
      : new Date()
    if (Number.isNaN(paidAt.getTime())) {
      throw Object.assign(new Error('Ungültiges Zahlungsdatum'), {
        statusCode: 400,
        statusMessage: 'Ungültiges Zahlungsdatum',
      })
    }

    out.push({
      item_index: idx,
      payment_method: raw.payment_method,
      payment_date: paidAt.toISOString(),
      amount_rappen: amount,
      linked_payment_id: raw.linked_payment_id || null,
      notes: raw.notes || null,
    })
  }

  return out
}

export function sumSettlementRappen(settlements: { amount_rappen: number }[]): number {
  return settlements.reduce((sum, s) => sum + (s.amount_rappen || 0), 0)
}

/** Invoice header outstanding (total − paid). Named to avoid clashing with accounting.ts. */
export function invoiceCreateOutstandingRappen(totalRappen: number, paidRappen: number): number {
  return Math.max(0, (totalRappen || 0) - (paidRappen || 0))
}

/** QR / payable amount: outstanding only; 0 means no payable QR. */
export function invoiceCreateQrAmountRappen(totalRappen: number, paidRappen: number, dunningFeesRappen = 0): number {
  const base = Math.max(0, (totalRappen || 0) - (dunningFeesRappen || 0))
  const paid = Math.max(0, paidRappen || 0)
  return Math.max(0, base - Math.min(paid, base))
}

export function isUuidV4(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function requireIdempotencyKey(key: unknown, hasSettlements: boolean): string | null {
  if (!hasSettlements) {
    return typeof key === 'string' && key ? key : null
  }
  if (!isUuidV4(key)) {
    throw Object.assign(new Error('idempotency_key (UUID) erforderlich bei bezahlten Positionen'), {
      statusCode: 400,
      statusMessage: 'idempotency_key (UUID) erforderlich bei bezahlten Positionen',
    })
  }
  return String(key)
}

export function paymentStatusForPaidTotal(totalRappen: number, paidRappen: number): 'pending' | 'partial' | 'paid' {
  if (paidRappen <= 0) return 'pending'
  if (paidRappen < totalRappen) return 'partial'
  return 'paid'
}
