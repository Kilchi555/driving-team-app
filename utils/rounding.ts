/**
 * Swiss franc rounding utilities
 *
 * Swiss law (OR Art. 84): the smallest circulating coin is the 5-Rappen piece.
 * Cash payments must therefore be rounded to the nearest multiple of 5 Rappen.
 * Electronic payments (Wallee, card, bank transfer) may use exact amounts, but
 * rounding to 5 Rappen is the accepted best practice.
 *
 * Max rounding error: ±2 Rappen (compared to ±49 Rappen when rounding to a full Franc)
 *
 * Examples:
 *   roundToNearest5Rappen(197) → 195   (CHF 1.97 → CHF 1.95)
 *   roundToNearest5Rappen(198) → 200   (CHF 1.98 → CHF 2.00)
 *   roundToNearest5Rappen(199) → 200   (CHF 1.99 → CHF 2.00)
 *   roundToNearest5Rappen(1643) → 1645 (CHF 16.43 → CHF 16.45)
 *   roundToNearest5Rappen(1697) → 1695 (CHF 16.97 → CHF 16.95)
 */
export function roundToNearest5Rappen(rappen: number): number {
  if (!Number.isFinite(rappen)) return 0
  return Math.round(rappen / 5) * 5
}

/**
 * @deprecated Use roundToNearest5Rappen instead.
 * Rounds to the nearest full Franc (100 Rappen). This produces rounding
 * errors of up to 49 Rappen and is not the correct Swiss standard.
 */
export function roundToNearestFranken(rappen: number): number {
  const remainder = rappen % 100
  if (remainder === 0) return rappen
  return remainder < 50 ? rappen - remainder : rappen + (100 - remainder)
}
