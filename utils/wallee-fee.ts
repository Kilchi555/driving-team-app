/** Flat Wallee processing fee on collected customer payments. */
export const WALLEE_FEE_RATE = 0.017
export const WALLEE_FEE_RATE_LABEL = '1.7%'
export const WALLEE_FEE_PRICE_TIP =
  'Viele Betriebe heben ihre Preise um 2–3 % an: Die App hat laufende Kosten, die 1.7 % Gebühr ist damit gedeckt, es bleibt ein kleiner Gewinn — und automatische Zahlungen sparen Zeit und Nachfassen.'

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

/** Nearest rappen of 1.7% on the collected amount. */
export function walleeFeeRappen(amountRappen: number): number {
  const gross = Math.max(0, Math.round(Number(amountRappen) || 0))
  if (gross <= 0) return 0
  return Math.round(gross * 17 / 1000)
}

export function walleeNetRappen(amountRappen: number): number {
  const gross = Math.max(0, Math.round(Number(amountRappen) || 0))
  return Math.max(0, gross - walleeFeeRappen(gross))
}

export function summarizeWalleeFees(
  payments: Array<{ total_amount_rappen?: number | null }>
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
    fee += walleeFeeRappen(amount)
  }
  return {
    count: payments.length,
    gross_rappen: gross,
    fee_rappen: fee,
    net_rappen: Math.max(0, gross - fee),
    rate: WALLEE_FEE_RATE,
  }
}
