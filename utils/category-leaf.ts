/**
 * Leaf categories for staff availability and pickers.
 * A row is a leaf when no other row points at it via parent_category_id.
 * Resolution uses category ids, not codes: "A" and "C" exist as both a main
 * and a subcategory with the same code.
 */

export type CategoryLeafRow = {
  id: number | string
  code?: string | null
  parent_category_id?: number | string | null
  tenant_id?: string | null
  is_active?: boolean | null
}

export function filterLeafCategories<T extends { id: number | string; parent_category_id?: number | string | null }>(
  categories: T[],
): T[] {
  const parentIds = new Set(
    categories.map((c) => c.parent_category_id).filter((id): id is number | string => id != null && id !== ''),
  )
  return categories.filter((c) => !parentIds.has(c.id))
}

export function dedupeSortedCategoryCodes(codes: string[]): string[] {
  return [...new Set(codes)].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
}

export type LeafCategoryDecision =
  | { ok: true; codes: string[] }
  | { ok: false; statusMessage: string }

/**
 * Accept only active leaf codes that belong to the staff tenant.
 * Empty selection is allowed. Any unknown, inactive, foreign, or
 * parent-with-children code rejects the whole write.
 */
export function selectPersistableLeafCodes(
  requested: unknown,
  categories: CategoryLeafRow[],
  tenantId: string,
): LeafCategoryDecision {
  if (!Array.isArray(requested) || requested.some((code) => typeof code !== 'string')) {
    return { ok: false, statusMessage: 'Kategorien müssen eine Liste von Codes sein' }
  }

  const codes = requested.map((code) => code.trim())
  if (codes.some((code) => code.length === 0)) {
    return { ok: false, statusMessage: 'Ungültiger Kategorie-Code' }
  }
  if (codes.length === 0) return { ok: true, codes: [] }

  const tenantRows = categories.filter(
    (row) => row.tenant_id === tenantId && row.is_active !== false && typeof row.code === 'string' && row.code.length > 0,
  )
  const allowed = new Set(filterLeafCategories(tenantRows).map((row) => row.code as string))
  if (codes.some((code) => !allowed.has(code))) {
    return {
      ok: false,
      statusMessage: 'Ungültige Kategorie. Nur aktive Leaf-Kategorien dieses Mandanten sind erlaubt.',
    }
  }

  return { ok: true, codes: dedupeSortedCategoryCodes(codes) }
}
