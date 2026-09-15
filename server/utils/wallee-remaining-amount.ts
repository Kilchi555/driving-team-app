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
