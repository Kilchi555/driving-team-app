import { remainingDueRappen } from '~/server/utils/apply-student-credit'

export type WalleeRemainingPayment = {
  total_amount_rappen?: number | null
  credit_used_rappen?: number | null
}

/**
 * Server-authoritative Wallee charge / capture expectation.
 * Reuses remainingDueRappen with pending (no cancel/partial extras) so this is
 * max(total_amount_rappen - credit_used_rappen, 0).
 */
export function walleeRemainingRappen(payment: WalleeRemainingPayment): number {
  return remainingDueRappen({
    id: 'wallee-remaining',
    user_id: '',
    total_amount_rappen: payment.total_amount_rappen,
    credit_used_rappen: payment.credit_used_rappen,
    payment_status: 'pending',
  })
}

export function walleeRemainingChf(payment: WalleeRemainingPayment): number {
  return walleeRemainingRappen(payment) / 100
}

/** Same field preference as webhook Layer 5.5 / #224. */
export function capturedAmountChfFromWalleeTx(tx: {
  completedAmount?: unknown
  authorizationAmount?: unknown
  authorizationAmountIncludingTax?: unknown
} | null | undefined): number {
  if (!tx || typeof tx !== 'object') return NaN
  return Number(
    tx.completedAmount ??
    tx.authorizationAmount ??
    tx.authorizationAmountIncludingTax ??
    NaN,
  )
}

/**
 * #224 gate used by webhook AND recovery cron.
 * Missing/non-finite capture does not reject (same as webhook).
 * Finite capture that does not match remaining MUST reject.
 */
export function shouldRejectWalleeCaptureMismatch(
  capturedChf: number,
  payment: WalleeRemainingPayment,
): boolean {
  if (!Number.isFinite(capturedChf)) return false
  return !isWalleeCaptureMatchingRemaining(capturedChf, payment)
}

/** 1-rappen (0.01 CHF) float tolerance, same as the previous webhook check. */
export function isWalleeCaptureMatchingRemaining(
  capturedChf: number,
  payment: WalleeRemainingPayment,
): boolean {
  const expectedChf = walleeRemainingChf(payment)
  if (!(expectedChf > 0) || !Number.isFinite(capturedChf)) return false
  return Math.abs(capturedChf - expectedChf) <= 0.01
}

export function isWalleeCaptureBelowRemaining(
  capturedChf: number,
  payment: WalleeRemainingPayment,
): boolean {
  const expectedChf = walleeRemainingChf(payment)
  return expectedChf > 0 && Number.isFinite(capturedChf) && capturedChf + 0.01 < expectedChf
}
