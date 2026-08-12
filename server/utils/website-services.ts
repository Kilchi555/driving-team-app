/**
 * Load bookable website services from pricing_rules (base_price).
 * The legacy `pricing` table does not exist in this schema.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { filterLeafCategories } from '~/server/utils/category-groups'

export type WebsiteServiceRow = {
  id: string
  name: string
  duration_minutes: number
  /** Price for base duration, in rappen (CHF cents). */
  price: number
  category: string
}

export async function loadWebsiteServices(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<WebsiteServiceRow[]> {
  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from('pricing_rules')
      .select('id, category_code, rule_type, price_per_minute_rappen, base_duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('rule_type', 'base_price')
      .order('category_code'),
    supabase
      .from('categories')
      .select('id, code, name, parent_category_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ])

  const allCats = categories || []
  const leafCats = filterLeafCategories(allCats)
  const leafCodes = new Set(leafCats.map((c: any) => c.code).filter(Boolean))
  const catName = new Map(allCats.map((c: any) => [c.code, c.name]))
  for (const c of leafCats) {
    if (c.code) catName.set(c.code, c.name)
  }

  return (rules || [])
    .filter((r: any) => {
      if (!r?.category_code) return false
      // Prefer leaf categories when hierarchy exists; otherwise keep all base prices
      if (leafCodes.size === 0) return true
      return leafCodes.has(r.category_code)
    })
    .map((r: any) => {
      const duration = Number(r.base_duration_minutes) || 45
      const ppm = Number(r.price_per_minute_rappen) || 0
      return {
        id: String(r.id),
        name: catName.get(r.category_code) || r.category_code || 'Angebot',
        duration_minutes: duration,
        price: Math.round(ppm * duration),
        category: r.category_code,
      }
    })
}
