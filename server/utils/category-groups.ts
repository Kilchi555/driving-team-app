/**
 * Central, DB-backed category-group resolution.
 *
 * Replaces the various hardcoded `B_CATEGORY_GROUP` / `BOOT_CATEGORY_GROUP`
 * duplicates that used to live in individual endpoints. The actual grouping
 * ("B Schaltung"/"B Automatik" belong to "B") is expressed in the database via
 * `categories.parent_category_id` and is loaded from there instead of being
 * duplicated in code.
 *
 * Note on Boot/Motorboot: `appointments.type`/`pricing_rules.category_code`
 * sometimes use "Boot", sometimes "Motorboot", but there is no `categories`
 * row that links them via `parent_category_id` (no "Motorboot" category
 * exists in some tenants). This is a known data inconsistency, tracked
 * separately as a data-cleanup task (see plan Phase 3 note) — not something
 * `parent_category_id` can resolve today, so it remains a small, explicit
 * alias list here rather than a code duplicate of business logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const BOOT_ALIASES = ['Boot', 'Motorboot']

interface CategoryRow {
  id: number | string
  code: string
  parent_category_id: number | string | null
}

/**
 * Resolves all category codes that belong to the same "group" as
 * `categoryCode` for admin-fee/appointment-counting purposes: the category
 * itself, its parent (if it's a subcategory) and all sibling subcategories.
 *
 * Falls back to `[categoryCode]` (no grouping) if the category can't be
 * found or has no tenant-scoped hierarchy.
 */
export async function resolveCategoryGroup(
  supabase: SupabaseClient,
  tenantId: string | null | undefined,
  categoryCode: string
): Promise<string[]> {
  if (!categoryCode) return []

  if (BOOT_ALIASES.includes(categoryCode)) return [...BOOT_ALIASES]

  if (!tenantId) return [categoryCode]

  const { data: rows, error } = await supabase
    .from('categories')
    .select('id, code, parent_category_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error || !rows || rows.length === 0) return [categoryCode]

  const categoryRows = rows as CategoryRow[]
  const self = categoryRows.find(r => r.code === categoryCode)
  if (!self) return [categoryCode]

  const parentId = self.parent_category_id ?? self.id
  const groupCodes = categoryRows
    .filter(r => r.id === parentId || r.parent_category_id === parentId)
    .map(r => r.code)

  return groupCodes.length > 0 ? groupCodes : [categoryCode]
}

/**
 * Whether a category should be exempt from the admin fee entirely, based on
 * the tenant's own pricing configuration (`admin_fee_applies_from`) instead
 * of a hardcoded motorcycle-category list. A very high threshold (as used
 * e.g. for motorcycle categories) means the fee is never reached in practice.
 */
export function isAdminFeeExempt(adminFeeAppliesFrom: number | null | undefined): boolean {
  return !adminFeeAppliesFrom || adminFeeAppliesFrom > 50
}
