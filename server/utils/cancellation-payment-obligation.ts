/**
 * Admin toggle for whether a cancelled appointment must still be paid.
 *
 * Money identity: the wallet should hold the collected amount that the school
 * does not keep at the target charge percentage.
 *   desiredWallet = collected * (100 - charge) / 100
 *   creditDelta   = desiredWallet - walletAlreadyPostedForThisAppointment
 *
 * Collected money already returned via Wallee is excluded. Wallet rows that
 * paid for the appointment (appointment_payment) are not treated as refunds.
 */

export const PREV_CHARGE_KEY = 'obligation_prev_charge_percentage'
export const PREV_CREDIT_KEY = 'obligation_credit_used_rappen'
export const PREV_STATUS_KEY = 'obligation_prev_payment_status'

const SETTLED = new Set(['completed', 'paid', 'refunded'])
const OPEN = new Set(['pending', 'authorized', 'processing', 'open', 'authorized_pending', ''])
const WALLET_REFUND_TYPES = new Set([
  'cancellation',
  'cancellation_credit_refund',
  'cancellation_charge_waiver',
  'cancellation_charge_reinstate',
  'refund',
])

export type ObligationPayment = {
  id: string
  payment_status?: string | null
  total_amount_rappen?: number | null
  credit_used_rappen?: number | null
  amount_paid_rappen?: number | null
  refunded_amount_rappen?: number | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
}

export type ObligationLedgerEntry = {
  transaction_type: string
  amount_rappen?: number | null
  payment_method?: string | null
  balance_before_rappen?: number | null
  balance_after_rappen?: number | null
  notes?: string | null
}

export type PlannedPaymentUpdate = {
  id: string
  payment_status: string
  credit_used_rappen?: number
  refunded_at?: string | null
  metadata: Record<string, unknown>
  noteSuffix: string
}

export type ObligationPlan = {
  ok: true
  noop: boolean
  currentlyMustPay: boolean
  nextMustPay: boolean
  previousChargePercentage: number | null
  nextChargePercentage: number
  creditDeltaRappen: number
  paymentUpdates: PlannedPaymentUpdate[]
  ledgerNote: string | null
  summary: string
}

export type ObligationPlanResult = ObligationPlan | { ok: false; error: string }

function nonnegInt(value: unknown): number {
  const n = Math.round(Number(value) || 0)
  return n > 0 ? n : 0
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...parsed }
    } catch {
      return {}
    }
  }
  return {}
}

export function formatObligationChf(rappen: number): string {
  const abs = (Math.abs(Math.round(rappen)) / 100).toFixed(2)
  return rappen < 0 ? `-CHF ${abs}` : `CHF ${abs}`
}

export function grossCollectedRappen(payment: ObligationPayment): number {
  const total = nonnegInt(payment.total_amount_rappen)
  const walleeRefunded = nonnegInt(payment.refunded_amount_rappen)
  const creditUsed = nonnegInt(payment.credit_used_rappen)
  const cashPaid = nonnegInt(payment.amount_paid_rappen)
  const status = (payment.payment_status || '').toLowerCase()

  if (SETTLED.has(status)) return Math.max(0, total - walleeRefunded)
  if (status === 'partial') return Math.max(0, cashPaid + creditUsed - walleeRefunded)
  if (status === 'cancelled') return 0
  if (OPEN.has(status)) return creditUsed
  return creditUsed
}

export function walletRefundPostedRappen(entries: ObligationLedgerEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (!WALLET_REFUND_TYPES.has(entry.transaction_type)) return sum
    if (entry.payment_method === 'wallee_refund') return sum
    if (entry.balance_before_rappen == null && entry.balance_after_rappen == null) return sum
    return sum + Math.round(Number(entry.amount_rappen) || 0)
  }, 0)
}

function storedCharge(payments: ObligationPayment[], ledger: ObligationLedgerEntry[]): number | null {
  for (const payment of payments) {
    const raw = asMetadata(payment.metadata)[PREV_CHARGE_KEY]
    const n = Number(raw)
    if (Number.isInteger(n) && n > 0 && n <= 100) return n
  }
  for (let i = ledger.length - 1; i >= 0; i--) {
    const entry = ledger[i]
    if (entry.transaction_type !== 'cancellation_charge_waiver') continue
    const match = /prev_charge=(\d+)/.exec(entry.notes || '')
    if (!match) continue
    const n = Number(match[1])
    if (Number.isInteger(n) && n > 0 && n <= 100) return n
  }
  return null
}

function nextStatusFor(payment: ObligationPayment, nextCharge: number, gross: number): string {
  const status = (payment.payment_status || '').toLowerCase()
  if (nextCharge === 0) {
    if (gross > 0 && (SETTLED.has(status) || status === 'partial')) return 'refunded'
    if (OPEN.has(status) || status === 'partial') return 'cancelled'
    return status || 'cancelled'
  }
  if (nextCharge >= 100) {
    if (status === 'refunded' && gross > 0) return 'completed'
    if (status === 'cancelled') return 'pending'
    return status || 'pending'
  }
  if (status === 'cancelled') return 'pending'
  return status || 'pending'
}

export function planCancellationObligationChange(input: {
  appointmentStatus?: string | null
  chargePercentage?: number | null
  mustPay: boolean
  note?: string | null
  payments?: ObligationPayment[]
  ledger?: ObligationLedgerEntry[]
  nowIso: string
}): ObligationPlanResult {
  if ((input.appointmentStatus || '').toLowerCase() !== 'cancelled') {
    return { ok: false, error: 'Nur stornierte Termine können hier geändert werden.' }
  }
  if (typeof input.mustPay !== 'boolean') {
    return { ok: false, error: 'must_pay muss wahr oder falsch sein.' }
  }

  const rawCharge = input.chargePercentage
  const currentCharge = rawCharge == null ? null : Math.max(0, Math.min(100, Math.round(Number(rawCharge) || 0)))
  const currentlyMustPay = currentCharge != null && currentCharge > 0
  const payments = input.payments || []
  const ledger = input.ledger || []
  const note = (input.note || '').trim()
  const restored = storedCharge(payments, ledger)
  const nextCharge = !input.mustPay
    ? 0
    : (currentlyMustPay ? (currentCharge as number) : (restored ?? 100))
  const gross = payments.reduce((sum, payment) => sum + grossCollectedRappen(payment), 0)
  const alreadyInWallet = walletRefundPostedRappen(ledger)
  const desiredWallet = Math.round(gross * (100 - nextCharge) / 100)
  const creditDeltaRappen = desiredWallet - alreadyInWallet
  const statusAlreadyMatches = input.mustPay ? currentlyMustPay : currentCharge === 0
  // A matching flag still moves money when the wallet does not match that flag:
  // missing credit after a waived paid cancellation, or credit that must be taken back.
  const walletNeedsRepair = statusAlreadyMatches && (
    (!input.mustPay && creditDeltaRappen > 0) ||
    (input.mustPay && creditDeltaRappen < 0)
  )
  if (statusAlreadyMatches && !walletNeedsRepair) {
    return {
      ok: true,
      noop: true,
      currentlyMustPay,
      nextMustPay: currentlyMustPay,
      previousChargePercentage: currentCharge,
      nextChargePercentage: currentCharge ?? 0,
      creditDeltaRappen: 0,
      paymentUpdates: [],
      ledgerNote: null,
      summary: currentlyMustPay
        ? 'Der Termin ist bereits zahlpflichtig.'
        : 'Für diesen Termin ist bereits keine Zahlung fällig.',
    }
  }

  const paymentUpdates: PlannedPaymentUpdate[] = []
  const summaryParts: string[] = []

  for (const payment of payments) {
    const paymentGross = grossCollectedRappen(payment)
    const status = (payment.payment_status || '').toLowerCase()
    const nextStatus = nextStatusFor(payment, nextCharge, paymentGross)
    const metadata = asMetadata(payment.metadata)
    let creditUsedUpdate: number | undefined

    if (nextCharge === 0) {
      metadata[PREV_CHARGE_KEY] = currentCharge ?? 100
      metadata[PREV_STATUS_KEY] = status || 'pending'
      metadata[PREV_CREDIT_KEY] = nonnegInt(payment.credit_used_rappen)
      if ((OPEN.has(status) || status === 'partial') && nonnegInt(payment.credit_used_rappen) > 0) {
        creditUsedUpdate = 0
      }
    } else {
      const storedCredit = Number(metadata[PREV_CREDIT_KEY])
      if (status === 'cancelled' && nextStatus === 'pending' && Number.isInteger(storedCredit) && storedCredit >= 0) {
        creditUsedUpdate = storedCredit
      }
      delete metadata[PREV_CHARGE_KEY]
      delete metadata[PREV_STATUS_KEY]
      delete metadata[PREV_CREDIT_KEY]
    }

    const changedStatus = nextStatus !== status
    const changedCredit = creditUsedUpdate !== undefined && creditUsedUpdate !== nonnegInt(payment.credit_used_rappen)
    if (!changedStatus && !changedCredit && nextCharge !== 0 && currentCharge === nextCharge) continue

    let refundedAt: string | null | undefined
    if (nextStatus === 'refunded' && status !== 'refunded') refundedAt = input.nowIso
    if (nextStatus === 'completed' && status === 'refunded') refundedAt = null

    paymentUpdates.push({
      id: payment.id,
      payment_status: nextStatus,
      ...(creditUsedUpdate !== undefined ? { credit_used_rappen: creditUsedUpdate } : {}),
      ...(refundedAt !== undefined ? { refunded_at: refundedAt } : {}),
      metadata,
      noteSuffix: `Zahlpflicht ${nextCharge}%${note ? `: ${note}` : ''}`,
    })

    if (nextStatus === 'cancelled' && status !== 'cancelled') {
      summaryParts.push('Die offene Zahlung wird aufgehoben.')
    } else if (nextStatus === 'pending' && status === 'cancelled') {
      summaryParts.push('Die Zahlung wird wieder als offen geführt.')
    } else if (nextStatus === 'refunded' && status !== 'refunded') {
      summaryParts.push('Die Zahlung wird als auf das Guthaben erstattet markiert.')
    } else if (nextStatus === 'completed' && status === 'refunded') {
      summaryParts.push('Die ursprüngliche Zahlung gilt wieder als bezahlt.')
    }
  }

  if (creditDeltaRappen > 0) {
    summaryParts.unshift(`${formatObligationChf(creditDeltaRappen)} werden dem Guthaben gutgeschrieben.`)
  } else if (creditDeltaRappen < 0) {
    summaryParts.unshift(`${formatObligationChf(Math.abs(creditDeltaRappen))} werden vom Guthaben abgezogen.`)
  }
  if (summaryParts.length === 0) {
    summaryParts.push(nextCharge === 0
      ? 'Der Termin ist nicht mehr zahlpflichtig.'
      : `Der Termin ist wieder zahlpflichtig (${nextCharge}%).`)
  }

  const prevForNote = currentCharge ?? restored ?? 100
  const ledgerNote = creditDeltaRappen !== 0
    ? `prev_charge=${prevForNote}; ${note || (nextCharge === 0 ? 'Zahlpflicht erlassen' : 'Zahlpflicht wiederhergestellt')}`
    : null

  return {
    ok: true,
    noop: false,
    currentlyMustPay,
    nextMustPay: nextCharge > 0,
    previousChargePercentage: currentCharge,
    nextChargePercentage: nextCharge,
    creditDeltaRappen,
    paymentUpdates,
    ledgerNote,
    summary: summaryParts.join(' '),
  }
}
