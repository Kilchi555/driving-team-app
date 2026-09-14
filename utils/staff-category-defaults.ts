/**
 * Staff calendar category defaults.
 *
 * Never invent license class "B" when the tenant has no categories.
 * requiresCategory is driving_school AND at least one real category.
 */

export function staffRequiresCategory(
  businessType: string | null | undefined,
  categoryCount: number
): boolean {
  const bt = businessType || 'driving_school'
  return bt === 'driving_school' && categoryCount > 0
}

/**
 * Default category for a new staff appointment.
 * Returns the first available tenant category, or null.
 * Does not invent "B".
 */
export function staffDefaultCategoryCode(availableCategoryCodes: string[]): string | null {
  const codes = availableCategoryCodes.map((c) => String(c || '').trim()).filter(Boolean)
  return codes[0] || null
}
