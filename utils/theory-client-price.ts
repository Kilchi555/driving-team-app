import { roundToNearest5Rappen } from '~/utils/rounding'

/**
 * Client-side theory lesson amount from the tenant's theory pricing rule.
 * Never invents CHF 85 — missing rules must surface as unpriced (server also fail-closes).
 */
export function clientTheoryLessonPriceRappen(input: {
  theoryPricePerMinuteRappen?: number | null
  durationMinutes: number
}): { priceRappen: number; missingRule: boolean } {
  const duration = Number(input.durationMinutes)
  if (!Number.isFinite(duration) || duration <= 0) {
    return { priceRappen: 0, missingRule: true }
  }
  const ppm = Number(input.theoryPricePerMinuteRappen)
  if (!Number.isFinite(ppm) || ppm <= 0) {
    return { priceRappen: 0, missingRule: true }
  }
  return {
    priceRappen: roundToNearest5Rappen(Math.round(ppm * duration)),
    missingRule: false,
  }
}

/** Case-insensitive membership in theory-enabled category codes from usePricing. */
export function categoryHasTheoryPricing(
  categoryCode: string | null | undefined,
  theoryEnabledCategories: readonly string[],
): boolean {
  const code = String(categoryCode || '').trim().toLowerCase()
  if (!code) return false
  return theoryEnabledCategories.some((c) => String(c || '').trim().toLowerCase() === code)
}
