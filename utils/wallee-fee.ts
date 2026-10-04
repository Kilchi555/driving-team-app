/** Simy application fee on collected Wallee payments. Not a Wallee acquirer settlement. */

/** Official Wallee payment method id for TWINT (global, not a merchant configuration name). */
export const WALLEE_TWINT_PAYMENT_METHOD_ID = 1457546097639

/** 1.35% = 135 / 10_000. Active rate for non-TWINT Wallee online payments. */
export const WALLEE_FEE_STANDARD_NUMERATOR = 135
/** 1.3% = 130 / 10_000. Active rate for TWINT Wallee online payments. */
export const WALLEE_FEE_TWINT_NUMERATOR = 130
const WALLEE_FEE_DENOMINATOR = 10_000

/**
 * 1.7% for payments completed before a fee kind was stored.
 * Display-only. New captures must not use this rate.
 */
export const WALLEE_FEE_LEGACY_RATE = 0.017

export const WALLEE_FEE_STANDARD_RATE = WALLEE_FEE_STANDARD_NUMERATOR / WALLEE_FEE_DENOMINATOR
export const WALLEE_FEE_TWINT_RATE = WALLEE_FEE_TWINT_NUMERATOR / WALLEE_FEE_DENOMINATOR

/** @deprecated Use WALLEE_FEE_STANDARD_RATE. Kept as the active standard rate. */
export const WALLEE_FEE_RATE = WALLEE_FEE_STANDARD_RATE

export const WALLEE_FEE_STANDARD_LABEL = '1,35 %'
export const WALLEE_FEE_TWINT_LABEL = '1,3 %'
export const WALLEE_FEE_PUBLIC_LABEL = '1,35 % (TWINT 1,3 %)'
export const WALLEE_FEE_RATE_LABEL = WALLEE_FEE_PUBLIC_LABEL

export const WALLEE_FEE_PRICE_TIP =
  'Viele Betriebe heben ihre Preise um 2–3 % an: Die App hat laufende Kosten, die Gebühr ist damit gedeckt, es bleibt ein kleiner Gewinn — und automatische Zahlungen sparen Zeit und Nachfassen.'

export type WalleeFeeKind = 'standard' | 'twint' | 'legacy'

const COMPLETED_STATUSES = new Set(['completed', 'paid'])

export function isWalleeCollectedPayment(payment: {
  payment_method?: string | null
  payment_provider?: string | null
  payment_status?: string | null
  refunded_at?: string | null
}): boolean {
  if (payment.refunded_at) return false
  const status = (payment.payment_status || '').toLowerCase()
  if (!COMPLETED_STATUSES.has(status)) return false
  const method = (payment.payment_method || '').toLowerCase()
  const provider = (payment.payment_provider || '').toLowerCase()
  return method === 'wallee' || provider === 'wallee'
}

function nearestRappen(gross: number, numerator: number): number {
  return Math.floor((gross * numerator + Math.floor(WALLEE_FEE_DENOMINATOR / 2)) / WALLEE_FEE_DENOMINATOR)
}

/** Nearest rappen. `kind` defaults to the active standard rate. */
export function walleeFeeRappen(amountRappen: number, kind: WalleeFeeKind = 'standard'): number {
  const gross = Math.max(0, Math.round(Number(amountRappen) || 0))
  if (gross <= 0) return 0
  if (kind === 'twint') return nearestRappen(gross, WALLEE_FEE_TWINT_NUMERATOR)
  if (kind === 'legacy') return Math.round(gross * 17 / 1000)
  return nearestRappen(gross, WALLEE_FEE_STANDARD_NUMERATOR)
}

export function walleeFeeLabel(kind: WalleeFeeKind): string {
  if (kind === 'twint') return WALLEE_FEE_TWINT_LABEL
  if (kind === 'legacy') return '1,7 %'
  return WALLEE_FEE_STANDARD_LABEL
}

export function walleeNetRappen(amountRappen: number, kind: WalleeFeeKind = 'standard'): number {
  const gross = Math.max(0, Math.round(Number(amountRappen) || 0))
  return Math.max(0, gross - walleeFeeRappen(gross, kind))
}

export function walleePaymentMethodIdFromTransaction(tx: unknown): number | null {
  if (!tx || typeof tx !== 'object') return null
  const connector = (tx as { paymentConnectorConfiguration?: unknown }).paymentConnectorConfiguration
  if (!connector || typeof connector !== 'object') return null
  const methodConfig = (connector as { paymentMethodConfiguration?: unknown }).paymentMethodConfiguration
  if (!methodConfig || typeof methodConfig !== 'object') return null
  const raw = (methodConfig as { paymentMethod?: unknown }).paymentMethod
  const id = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

export function walleeFeeKindFromPaymentMethodId(id: number | null | undefined): Exclude<WalleeFeeKind, 'legacy'> | null {
  if (id == null || !Number.isFinite(id) || id <= 0) return null
  if (id === WALLEE_TWINT_PAYMENT_METHOD_ID) return 'twint'
  return 'standard'
}

export function walleeFeeKindFromTransaction(tx: unknown): Exclude<WalleeFeeKind, 'legacy'> | null {
  return walleeFeeKindFromPaymentMethodId(walleePaymentMethodIdFromTransaction(tx))
}

export function walleeFeeKindFromMetadata(metadata: unknown): WalleeFeeKind {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'legacy'
  const kind = (metadata as { wallee_fee_kind?: unknown }).wallee_fee_kind
  if (kind === 'twint' || kind === 'standard') return kind
  return 'legacy'
}

export function summarizeWalleeFees(
  payments: Array<{ total_amount_rappen?: number | null, fee_kind?: WalleeFeeKind | null }>
): {
  count: number
  gross_rappen: number
  fee_rappen: number
  net_rappen: number
  rate: number
} {
  let gross = 0
  let fee = 0
  for (const payment of payments) {
    const amount = Math.max(0, Math.round(Number(payment.total_amount_rappen) || 0))
    if (amount <= 0) continue
    gross += amount
    fee += walleeFeeRappen(amount, payment.fee_kind || 'standard')
  }
  return {
    count: payments.length,
    gross_rappen: gross,
    fee_rappen: fee,
    net_rappen: Math.max(0, gross - fee),
    rate: WALLEE_FEE_STANDARD_RATE,
  }
}
