/**
 * discounts.category_filter supports:
 * - null / '' / 'all' → all categories
 * - single code: "B Automatik"
 * - comma-separated: "B Automatik,B Schaltung"
 */
export function parseDiscountCategoryFilter(filter: string | null | undefined): string[] | null {
  if (filter == null) return null
  const raw = String(filter).trim()
  if (!raw || raw.toLowerCase() === 'all') return null
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  return parts.length ? parts : null
}

export function matchesDiscountCategoryFilter(
  filter: string | null | undefined,
  categoryCode: string | null | undefined,
): boolean {
  const allowed = parseDiscountCategoryFilter(filter)
  if (!allowed) return true
  const code = String(categoryCode || '').trim()
  if (!code) return false
  return allowed.some((a) => a.toLowerCase() === code.toLowerCase())
}

/** For promo booking deep-links: one category (or parent group) to preselect. */
export function primaryCategoryForDiscountFilter(filter: string | null | undefined): string | null {
  const allowed = parseDiscountCategoryFilter(filter)
  if (!allowed?.length) return null
  if (allowed.length === 1) return allowed[0]
  const parents = new Set(
    allowed.map((c) => (c.includes(' ') ? c.split(' ')[0] : c)),
  )
  if (parents.size === 1) return [...parents][0]
  return allowed[0]
}
